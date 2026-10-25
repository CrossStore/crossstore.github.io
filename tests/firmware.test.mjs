import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import { devices, validateRelease, verifyAsset, verifyDevice } from '../scripts/firmware.mjs';
import { verifyDownload, flashManifest } from '../src/integrity.js';

const release = JSON.parse(await readFile(new URL('../firmware-release.json', import.meta.url)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('all three exact boards have complete, pinned public release assets', () => {
  validateRelease(release);
  assert.equal(devices.length, 3);
  for (const device of devices) {
    for (const suffix of ['full-install.bin', 'firmware.bin', 'bootloader.bin', 'partitions.bin', 'boot_app0.bin', 'install-manifest.json']) {
      assert.equal(release.assets.filter(a => a.name === `${device.id}-${suffix}`).length, 1);
    }
  }
});

test('release rejects asset replacement, path traversal, foreign URLs and duplicate names', () => {
  for (const change of [a => a.name = '../wrong.bin', a => a.sha256 = '', a => a.url = 'https://example.com/wrong.bin']) {
    const data = structuredClone(release); change(data.assets[0]);
    assert.throws(() => validateRelease(data));
  }
  const duplicate = structuredClone(release); duplicate.assets.push(duplicate.assets[0]);
  assert.throws(() => validateRelease(duplicate));
});

test('build and browser both reject truncated or modified firmware', async () => {
  const good = Buffer.from([0xe9, 1, 2, 3]);
  const asset = { name: 'test.bin', bytes: good.length, sha256: sha256(good) };
  verifyAsset(asset, good);
  await verifyDownload(good, asset, webcrypto.subtle);
  for (const bad of [good.subarray(0, 3), Buffer.from([0xe9, 1, 2, 4])]) {
    assert.throws(() => verifyAsset(asset, bad));
    await assert.rejects(verifyDownload(bad, asset, webcrypto.subtle));
  }
});

function fixture() {
  const device = devices[0];
  const files = new Map();
  const full = Buffer.alloc(65540, 0xff);
  const parts = [['bootloader', 'bootloader.bin', 0], ['partitions', 'partitions.bin', 32768], ['boot_app0', 'boot_app0.bin', 57344], ['firmware', 'firmware.bin', 65536]].map(([role, suffix, offset]) => {
    const bytes = Buffer.from([0xe9, 1, 2, 3]);
    bytes.copy(full, offset); files.set(`${device.id}-${suffix}`, bytes);
    return { name: `${device.id}-${suffix}`, role, offset, size: bytes.length, sha256: sha256(bytes) };
  });
  files.set(`${device.id}-full-install.bin`, full);
  parts.push({ name: `${device.id}-full-install.bin`, role: 'full_install', offset: 0, size: full.length, sha256: sha256(full) });
  const manifest = { deviceSlug: device.id, targetId: device.targetId, chip: 'ESP32-S3', flash: { size: 16777216 }, appStore: true, crossmuxSha: release.sourceSha, sdkSha: release.sdkSha, assets: parts };
  const save = () => files.set(`${device.id}-install-manifest.json`, Buffer.from(JSON.stringify(manifest)));
  save(); return { device, files, manifest, save };
}

test('verify full image against all source pieces, not only an image header', () => {
  const f = fixture(); verifyDevice(f.device, release, f.files);
  f.files.get(`${f.device.id}-full-install.bin`)[65537] ^= 1;
  f.manifest.assets.find(p => p.role === 'full_install').sha256 = sha256(f.files.get(`${f.device.id}-full-install.bin`));
  f.save(); assert.throws(() => verifyDevice(f.device, release, f.files), /differs/);
});

test('block mixed-board, wrong-offset, stale-source and incomplete manifests', () => {
  for (const mutate of [m => m.targetId = devices[1].targetId, m => m.assets[3].offset = 0, m => m.crossmuxSha = '0'.repeat(40), m => m.assets.pop(), m => m.flash.size = 8388608]) {
    const f = fixture(); mutate(f.manifest); f.save();
    assert.throws(() => verifyDevice(f.device, release, f.files));
  }
});

test('web flashing uses only verified local blob at full-image offset zero', () => {
  for (const d of devices) {
    const manifest = flashManifest(d, 'blob:https://crossstore.github.io/verified');
    assert.deepEqual(manifest.builds, [{ chipFamily: 'ESP32-S3', parts: [{ path: 'blob:https://crossstore.github.io/verified', offset: 0 }] }]);
    assert.throws(() => flashManifest(d, 'https://example.com/unverified.bin'));
  }
  assert.throws(() => flashManifest({ id: 'esp32-c3' }, 'blob:wrong'));
});
