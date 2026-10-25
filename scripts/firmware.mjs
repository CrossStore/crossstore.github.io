import { createHash } from 'node:crypto';

export const devices = [
  { id: 'papermono', targetId: 'm5stack_paper_mono', name: 'PaperMono', brand: 'M5STACK', model: 'M5Stack PaperMono', type: 'mono', screen: '紧凑屏幕 · 实体按键', note: '阅读、应用与聊天已实机体验。内置蜂鸣器不适合音乐播放。' },
  { id: 'papers3', targetId: 'm5stack_papers3', name: 'PaperS3', brand: 'M5STACK', model: 'M5Stack PaperS3', type: 'paper', screen: '大屏触控 · 16 灰阶', note: '显示、触摸、阅读、休眠恢复与应用商店已实机体验。' },
  { id: 'waveshare-epaper-397', targetId: 'waveshare_epaper_397', name: 'e-Paper 3.97', brand: 'WAVESHARE', model: 'Waveshare ESP32-S3-ePaper-3.97', type: 'wave', screen: '3.97 英寸 · 实体按键', note: '阅读、按键与商店已实机体验。AirTune 可以出声，响度仍待优化。' },
  { id: 'm5paper-v11', targetId: 'm5stack_m5paper_v11', name: 'M5Paper v1.1', brand: 'M5STACK', model: 'M5Stack M5Paper v1.1', type: 'paper', screen: '老款 ESP32 · 16 灰阶', experimental: true, chip: 'ESP32', chipId: 0, bootloaderOffset: 4096, flashFrequency: '40m', note: '实验版，尚未实机验证。适用于老款 M5Paper v1.1，不能与 PaperS3 混刷。显示、触摸、TF 卡与休眠待验证；不支持 USB 磁盘和 wifi_chat。' },
].map(d => ({ chip: 'ESP32-S3', chipId: 9, bootloaderOffset: 0, flashFrequency: '80m', ...d }));

export function verifyAsset(asset, bytes) {
  if (bytes.length !== asset.bytes) throw new Error(`${asset.name}: size mismatch`);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`${asset.name}: SHA-256 mismatch`);
}

export function validateRelease(release) {
  if (release.repository !== 'zhuzhe1983/crossmux' || !/^[a-f0-9]{40}$/.test(release.sourceSha) || !/^[a-f0-9]{40}$/.test(release.sdkSha)) throw new Error('Invalid release provenance');
  const names = new Set();
  for (const asset of release.assets) {
    if (!/^[\w.-]+$/.test(asset.name) || names.has(asset.name)) throw new Error('Invalid or duplicate asset name');
    names.add(asset.name);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > 16777216) throw new Error('Invalid asset integrity metadata');
    const expected = `https://github.com/${release.repository}/releases/download/${release.tag}/${asset.name}`;
    if (asset.url !== expected) throw new Error('Asset outside pinned release');
  }
}

export function verifyDevice(device, release, files) {
  const manifest = JSON.parse(files.get(`${device.id}-install-manifest.json`).toString());
  if (manifest.deviceSlug !== device.id || manifest.targetId !== device.targetId || manifest.chip !== device.chip || manifest.flash?.frequency !== device.flashFrequency || manifest.flash?.size !== 16777216 || !manifest.appStore || manifest.crossmuxSha !== release.sourceSha || manifest.sdkSha !== release.sdkSha) throw new Error(`${device.id}: incompatible manifest`);
  const full = files.get(`${device.id}-full-install.bin`);
  const offsets = { bootloader: device.bootloaderOffset, partitions: 32768, boot_app0: 57344, firmware: 65536, full_install: 0 };
  if (manifest.assets.length !== 5 || new Set(manifest.assets.map(a => a.role)).size !== 5) throw new Error('Incomplete install manifest');
  for (const part of manifest.assets) {
    if (!(part.role in offsets) || part.offset !== offsets[part.role]) throw new Error('Unsafe flash offset');
    const bytes = files.get(part.name);
    if (!part.name.startsWith(`${device.id}-`) || !bytes) throw new Error('Cross-device firmware part');
    verifyAsset({ name: part.name, bytes: part.size, sha256: part.sha256 }, bytes);
    if (part.role !== 'full_install' && !full.subarray(part.offset, part.offset + bytes.length).equals(bytes)) throw new Error('Merged image differs from release parts');
  }
  for (const offset of [device.bootloaderOffset, 65536]) {
    if (full.length < offset + 24 || full[offset] !== 0xe9 || full.readUInt16LE(offset + 12) !== device.chipId) throw new Error('Invalid ESP chip image');
  }
  const bootFrequency = device.flashFrequency === '40m' ? 0x40 : 0x4f;
  if (full[device.bootloaderOffset + 3] !== bootFrequency) throw new Error('Invalid boot flash frequency');
  if (full.length > 16777216 || !full.subarray(0, device.bootloaderOffset).every(b => b === 0xff)) throw new Error('Invalid merged prefix/length');
  return manifest;
}
