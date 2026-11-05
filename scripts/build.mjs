import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { devices, pendingDevices, validateRelease, verifyAsset, verifyDevice } from './firmware.mjs';
import { issueLink } from '../src/integrity.js';
import { translate } from '../src/messages.js';
import './app-icons.mjs';

const release = JSON.parse(await readFile('firmware-release.json', 'utf8'));
validateRelease(release);
// Public device selection is curated; archived release metadata stays intact.
const featuredIds = new Set(['papers3', 'papermono']);
const cache = resolve(process.env.FIRMWARE_CACHE_DIR || '.cache/firmware');
await mkdir(cache, { recursive: true });
await rm('dist/firmware', { recursive: true, force: true });
await mkdir('dist/firmware', { recursive: true });
await cp('public', 'dist', { recursive: true });
await mkdir('dist/licenses', { recursive: true });
for (const [pkg, filename] of [['esp-web-tools', 'LICENSE'], ['esptool-js', 'LICENSE'], ['pako', 'LICENSE'], ['tslib', 'LICENSE.txt'], ['atob-lite', 'LICENSE.md']]) {
  await cp(`node_modules/${pkg}/${filename}`, `dist/licenses/${pkg}.txt`);
}
await cp('LICENSE', 'dist/licenses/website.txt');
const files = new Map();
for (const asset of release.assets.filter(asset => [...featuredIds].some(id => asset.name.startsWith(`${id}-`)))) {
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
const models = devices.filter(device => featuredIds.has(device.id)).sort((a, b) => a.id === 'papers3' ? -1 : b.id === 'papers3' ? 1 : 0).map(device => {
  const manifest = verifyDevice(device, release, files);
  const asset = release.assets.find(a => a.name === `${device.id}-full-install.bin`);
  return { ...device, version: manifest.version, file: `/firmware/${asset.name}`, bytes: asset.bytes, sha256: asset.sha256 };
});
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const icon = id => `<img src="/assets/app-icons/${id}.svg" width="64" height="64" alt="" loading="lazy">`;
const source = await readFile('src/index.html', 'utf8');
const credits = await readFile('src/credits.html', 'utf8');
const brands = [...new Set([...models, ...pendingDevices].map(d => d.brand))];
for (const locale of ['zh', 'en']) {
  const t = (key, values) => translate(locale, key, values);
  const root = locale === 'en' ? '/en/' : '/';
  const other = locale === 'en' ? '/' : '/en/';
  const otherLocale = locale === 'en' ? 'zh' : 'en';
  const localizedModels = models.map(d => ({...d, screen: t(`flash.spec.${d.id}`), note: t(`flash.note.${d.id}`)}));
  const values = {
    LANG: locale === 'en' ? 'en' : 'zh-CN', HOME: root, OTHER_HOME: other,
    OTHER_LANG: otherLocale, OTHER_HTML_LANG: otherLocale === 'zh' ? 'zh-CN' : 'en',
    OTHER_LABEL: locale === 'en' ? '中文' : 'EN', CREDITS: `${root}credits.html`, OTHER_CREDITS: `${other}credits.html`,
    RELEASE_URL: release.releaseUrl, SHORT_SHA: release.sourceSha.slice(0, 7),
    BRAND_FILTERS: brands.map(brand => {
      const count = models.filter(d => d.brand === brand).length;
      return `<button type="button" class="brand-filter" data-brand-filter="${brand}" aria-pressed="false" aria-controls="model-options">${brand}<span>${count ? t('flash.modelCount', {count}) : t('flash.testing')}</span></button>`;
    }).join(''),
    DEVICES: localizedModels.map(d => `<label class="device-card" data-brand="${d.brand}" hidden><input type="radio" name="device" value="${d.id}"><span class="selection-mark" aria-hidden="true"></span><span class="device-art ${d.type}" aria-hidden="true"><span class="mini-screen"><span>CrossStore</span><span class="mini-icons">${icon('book_store')}${icon('reading_stats')}${icon('appstore')}${icon('weread')}</span><i></i></span></span><span class="brand">${d.brand}</span><span class="device-name">${d.name}</span><span class="device-spec">${d.screen}</span><span class="tested">${t('flash.testDevice')}</span></label>`).join(''),
    PENDING_DEVICES: pendingDevices.map(d => `<article class="pending-device" data-brand="${d.brand}" hidden><div><span class="pill">${t('flash.pendingBadge')}</span><h3>${d.name}</h3><p>${t('flash.pendingNote')}</p></div><a href="${escape(issueLink({...d, version:t('flash.pending')}, release, locale))}" target="_blank" rel="noopener">${t('flash.pendingLink')} ↗</a></article>`).join(''),
    WEEKDAYS: t('calendar.days').split(',').map(day => `<span>${day}</span>`).join(''),
    CALENDAR: Array.from({length:30}, (_,i) => {
      const day=i+1, read=[1,3,5,7,8,11,14,17,18,21,25,28].includes(day);
      return `<span class="calendar-day${read ? ' has-reading' : ''}" aria-label="${escape(t('calendar.day',{day,status:t(read?'calendar.read':'calendar.unread')}))}">${day}${read?'<i aria-hidden="true"></i>':''}</span>`;
    }).join(''),
    FAQ: Array.from({length:6},(_,i)=>`<details><summary>${t(`faq.q${i+1}`)}</summary><p>${t(`faq.a${i+1}`)}</p>${i===5?`<a class="text-link" href="https://github.com/CrossStore/CrossStore">${t('faq.develop')} ↗</a>`:''}</details>`).join(''),
    DATA: JSON.stringify({models:localizedModels,release}).replaceAll('<','\\u003c'),
  };
  const render = template => {
    const html = template.replace(/\{\{([A-Z_]+)\}\}/g,(_,key) => {
      if(!(key in values)) throw new Error(`Missing template value: ${key}`);
      return values[key];
    }).replace(/\[\[([\w.]+)\]\]/g,(_,key)=>t(key));
    if (/\{\{|\[\[/.test(html)) throw new Error('Unresolved template value');
    return html;
  };
  await mkdir(`dist${root}`,{recursive:true});
  await writeFile(`dist${root}index.html`,render(source));
  await writeFile(`dist${root}credits.html`,render(credits));
}
await writeFile('dist/.nojekyll','');
await writeFile('dist/firmware-release.json',JSON.stringify(release,null,2));
await build({entryPoints:['src/app.js'],bundle:true,splitting:true,format:'esm',outdir:'dist/assets',minify:true,target:['es2022'],legalComments:'linked'});
console.log(`Built Chinese and English CrossStore pages with ${models.length} verified device images.`);
