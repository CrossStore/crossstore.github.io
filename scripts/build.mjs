import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { devices, pendingDevices, validateRelease, verifyAsset, verifyDevice } from './firmware.mjs';
import { issueLink } from '../src/integrity.js';

const release = JSON.parse(await readFile('firmware-release.json', 'utf8'));
validateRelease(release);
const cache = resolve(process.env.FIRMWARE_CACHE_DIR || '.cache/firmware');
await mkdir(cache, { recursive: true });
await mkdir('dist/firmware', { recursive: true });
await cp('public', 'dist', { recursive: true });
await mkdir('dist/licenses', { recursive: true });
for (const [pkg, filename] of [['esp-web-tools', 'LICENSE'], ['esptool-js', 'LICENSE'], ['pako', 'LICENSE'], ['tslib', 'LICENSE.txt'], ['atob-lite', 'LICENSE.md']]) {
  await cp(`node_modules/${pkg}/${filename}`, `dist/licenses/${pkg}.txt`);
}
await cp('LICENSE', 'dist/licenses/website.txt');
const files = new Map();
for (const asset of release.assets) {
  let bytes;
  try { bytes = await readFile(resolve(cache, asset.name)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(asset.url, { signal: AbortSignal.timeout(120000) });
        if (!response.ok) throw new Error(`${asset.name}: HTTP ${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer());
        verifyAsset(asset, bytes);
        await writeFile(resolve(cache, asset.name), bytes);
        break;
      } catch (error) { if (attempt === 2) throw error; }
    }
  }
  verifyAsset(asset, bytes);
  files.set(asset.name, bytes);
  await writeFile(`dist/firmware/${asset.name}`, bytes);
}
const models = devices.map(device => {
  const manifest = verifyDevice(device, release, files);
  const asset = release.assets.find(a => a.name === `${device.id}-full-install.bin`);
  return { ...device, version: manifest.version, file: `/firmware/${asset.name}`, bytes: asset.bytes, sha256: asset.sha256 };
});
const apps = [
  ['weread', '微信读书', '继续你的阅读'], ['airtune', 'AirTune', '随手打开电台'],
  ['game2048', '2048', '来一局数字游戏'], ['gomoku', '五子棋', '黑白之间的乐趣'],
  ['woodfish', '木鱼', '留一点安静时间'], ['calculator', '计算器', '日常随手算'],
  ['rf_chat', 'rf_chat', 'LoRa 附近聊天'], ['wifi_chat', 'wifi_chat', 'Wi-Fi 网络聊天'],
  ['esp_chat', 'esp_chat', 'ESP-NOW 广播群聊'], ['reading_stats', '阅读统计', '看见阅读的积累'],
];
const icon = (id, cls = '') => `<img class="${cls}" src="/assets/apps/${id}.png" width="64" height="64" alt="" loading="lazy">`;
let html = await readFile('src/index.html', 'utf8');
const brands = [...new Set([...models, ...pendingDevices].map(d => d.brand))];
html = html.replace('{{BRAND_FILTERS}}', brands.map(brand => {
  const count = models.filter(d => d.brand === brand).length;
  return `<button type="button" class="brand-filter" data-brand-filter="${brand}" aria-pressed="false" aria-controls="model-options">${brand}<span>${count}</span></button>`;
}).join(''));
html = html.replace('{{DEVICES}}', models.map(d => `
  <label class="device-card" data-brand="${d.brand}" hidden>
    <input type="radio" name="device" value="${d.id}">
    <span class="selection-mark" aria-hidden="true"></span>
    <span class="device-art ${d.type}" aria-hidden="true"><span class="mini-screen"><span>CrossStore</span><span class="mini-icons">${icon('appstore')}${icon('game2048')}${icon('airtune')}${icon('weread')}</span><i></i><i></i></span><span class="device-keys">•••</span></span>
    <span class="brand">${d.brand}</span><span class="device-name">${d.name}</span>
    <span class="device-spec">${d.screen}</span><span class="tested${d.experimental ? ' experimental' : ''}">${d.validationLabel || (d.experimental ? 'Alpha · 未实机测试' : '已有实机测试记录')}</span>
  </label>`).join(''));
html = html.replace('{{PENDING_DEVICES}}', pendingDevices.map(d => `<article class="pending-device" data-brand="${d.brand}" hidden><div><span class="pill">待适配 · 尚无固件</span><h3>${d.name}</h3><p>${d.note}</p></div><a href="${issueLink(d, release).replaceAll('&', '&amp;')}" target="_blank" rel="noopener">提供硬件信息 / 提交问题 ↗</a></article>`).join(''));
html = html.replace('{{APPS}}', apps.map(([id, name, text]) => `<a class="app-card" href="https://github.com/CrossStore/CrossStore/tree/main/packages/${id}">${icon(id)}<span><strong>${name}</strong><small>${text}</small></span><span class="app-arrow" aria-hidden="true">↗</span></a>`).join(''));
html = html.replaceAll('{{RELEASE_URL}}', release.releaseUrl).replaceAll('{{SHORT_SHA}}', release.sourceSha.slice(0, 7));
html = html.replace('{{DATA}}', JSON.stringify({ models, release }).replaceAll('<', '\\u003c'));
await writeFile('dist/index.html', html);
await writeFile('dist/.nojekyll', '');
await writeFile('dist/firmware-release.json', JSON.stringify(release, null, 2));
await build({ entryPoints: ['src/app.js'], bundle: true, splitting: true, format: 'esm', outdir: 'dist/assets', minify: true, target: ['es2022'], legalComments: 'linked' });
console.log(`Built CrossStore with ${models.length} verified device images, source ${release.sourceSha.slice(0, 7)}.`);
