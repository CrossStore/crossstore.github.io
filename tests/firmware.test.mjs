import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import { devices, pendingDevices, validateRelease, verifyAsset, verifyDevice } from '../scripts/firmware.mjs';
import { verifyDownload, flashManifest, issueLink } from '../src/integrity.js';

const release = JSON.parse(await readFile(new URL('../firmware-release.json', import.meta.url)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('all integrated boards have complete, pinned public release assets', () => {
  validateRelease(release);
  assert.equal(devices.length, 13);
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

function fixture(device = devices[0]) {
  const files = new Map();
  const full = Buffer.alloc(65560, 0xff);
  const parts = [['bootloader', 'bootloader.bin', device.bootloaderOffset], ['partitions', 'partitions.bin', 32768], ['boot_app0', 'boot_app0.bin', 57344], ['firmware', 'firmware.bin', 65536]].map(([role, suffix, offset]) => {
    const bytes = Buffer.alloc(24);
    bytes[0] = 0xe9; bytes[3] = device.flashFrequency === '40m' ? 0x40 : 0x4f;
    bytes.writeUInt16LE(device.chipId, 12);
    bytes.copy(full, offset); files.set(`${device.id}-${suffix}`, bytes);
    return { name: `${device.id}-${suffix}`, role, offset, size: bytes.length, sha256: sha256(bytes) };
  });
  files.set(`${device.id}-full-install.bin`, full);
  parts.push({ name: `${device.id}-full-install.bin`, role: 'full_install', offset: 0, size: full.length, sha256: sha256(full) });
  const manifest = { deviceSlug: device.id, targetId: device.targetId, models: device.models, chip: device.chip, flash: { size: 16777216, frequency: device.flashFrequency }, appStore: true, validationStatus: device.experimental ? 'alpha-unverified' : 'prior-hardware-record', crossmuxSha: release.sourceSha, sdkSha: release.sdkSha, assets: parts };
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
    assert.deepEqual(manifest.builds, [{ chipFamily: d.chip, parts: [{ path: 'blob:https://crossstore.github.io/verified', offset: 0 }] }]);
    assert.throws(() => flashManifest(d, 'https://example.com/unverified.bin'));
  }
  assert.throws(() => flashManifest({ id: 'esp32-c3' }, 'blob:wrong'));
});


test('classic ESP32 boot offset, chip and frequency cannot be confused with S3', () => {
  const device = devices.find(d => d.id === 'm5paper-v11');
  verifyDevice(device, release, fixture(device).files);
  for (const change of [m => m.chip = 'ESP32-S3', m => m.assets[0].offset = 0, m => m.flash.frequency = '80m']) {
    const f = fixture(device); change(f.manifest); f.save();
    assert.throws(() => verifyDevice(device, release, f.files));
  }
  for (const [position, value] of [[0, 0xe9], [4096 + 12, 9], [4096 + 3, 0x4f]]) {
    const f = fixture(device);
    const full = f.files.get(`${device.id}-full-install.bin`); full[position] = value;
    const boot = f.files.get(`${device.id}-bootloader.bin`);
    if (position >= 4096) boot[position - 4096] = value;
    for (const a of f.manifest.assets) a.sha256 = sha256(f.files.get(a.name));
    f.save(); assert.throws(() => verifyDevice(device, release, f.files), /Invalid/);
  }
  assert.throws(() => flashManifest({ ...device, chip: 'ESP32-S3' }, 'blob:verified'));
});


test('issue links include the selected model, alpha status and immutable source', () => {
  const device = { ...devices.find(d => d.id === 'm5paper-v11'), version: 'test+1' };
  const url = new URL(issueLink(device, release));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/zhuzhe1983/crossmux/issues/new');
  assert.match(url.searchParams.get('title'), /Alpha.*M5Paper 初代 \/ v1.1/);
  const body = url.searchParams.get('body');
  for (const value of [device.model, device.version, release.sourceSha, release.sdkSha, '初代有基础实测记录，v1.1 未实机测试']) assert.ok(body.includes(value));
});


test('pending Ink4 Plus cannot enter flash transport, and alpha labels cannot be promoted', () => {
  for (const d of pendingDevices) {
    assert.throws(() => flashManifest(d, 'blob:unavailable'));
    assert.match(new URL(issueLink(d, release)).searchParams.get('body'), /待适配，暂无可刷写固件/);
  }
  const d = devices.find(d => d.id === 'xteink');
  const f = fixture(d); verifyDevice(d, release, f.files);
  f.manifest.validationStatus = 'prior-hardware-record'; f.save();
  assert.throws(() => verifyDevice(d, release, f.files), /incompatible/);
});

test('shared M5Paper image must explicitly cover original and v1.1 revisions', () => {
  const device = devices.find(d => d.id === 'm5paper-v11');
  assert.deepEqual(device.models, ['m5paper_v10', 'm5paper_v11']);
  for (const models of [undefined, ['m5paper_v11'], ['m5paper_s3']]) {
    const f = fixture(device); f.manifest.models = models; f.save();
    assert.throws(() => verifyDevice(device, release, f.files), /model coverage/);
  }
});
