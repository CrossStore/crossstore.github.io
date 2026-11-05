import { t, locale } from './i18n.js';
import './home.js';
import { verifyDownload, flashManifest, issueLink } from './integrity.js';

const { models, release } = JSON.parse(document.querySelector('#site-data').textContent);
const $ = id => document.getElementById(id);
const supported = window.isSecureContext && 'serial' in navigator;
let model, verifiedUrl, flashFunction, request, generation = 0, busy = false;
const setStatus = (message, kind = '') => { $('flash-status').textContent = message; $('flash-status').className = `flash-status ${kind}`; };
const resetPrepared = () => {
  generation++;
  request?.abort();
  if (verifiedUrl) URL.revokeObjectURL(verifiedUrl);
  verifiedUrl = undefined;
  $('connect').hidden = true;
  $('prepare').hidden = false;
  $('prepare').disabled = !supported || !model || !$('acknowledge').checked;
  $('flash-progress').hidden = true;
  $('prepare').textContent = t('flash.prepare');
};

$('browser-note').textContent = supported
  ? t('flash.supported')
  : t('flash.unsupported');

document.querySelectorAll('input[name="device"]').forEach(input => input.addEventListener('change', () => {
  model = models.find(d => d.id === input.value);
  $('acknowledge').checked = false;
  $('acknowledge').disabled = !supported;
  resetPrepared();
  $('selected-name').textContent = model.model;
  $('selected-note').textContent = model.note;
  $('report-issue').href = issueLink(model, release, locale);
  $('ack-label').textContent = t(model.experimental ? 'flash.ackExperimental' : 'flash.ackModel', { model: model.model });
  $('firmware-version').textContent = model.version;
  $('firmware-size').textContent = `${(model.bytes / 1024 / 1024).toFixed(2)} MiB`;
  $('firmware-facts').hidden = false;
  $('download-details').hidden = false;
  $('checksum').textContent = model.sha256;
  $('full-download').href = model.file;
  $('app-download').href = `/firmware/${model.id}-firmware.bin`;
  $('flasher-panel').hidden = false;
  setStatus(supported ? t('flash.readyConfirm') : t('flash.manual'));
}));

const initialSelectionNote = $('selected-note').textContent;
const filterButtons = [...document.querySelectorAll('[data-brand-filter]')];
const deviceCards = [...document.querySelectorAll('.device-card, .pending-device')];
filterButtons.forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  const brand = button.dataset.brandFilter;
  for (const tab of filterButtons) tab.setAttribute('aria-pressed', String(tab === button));
  for (const card of deviceCards) card.hidden = card.dataset.brand !== brand;
  $('model-options').hidden = false;
  const available = deviceCards.filter(card => !card.hidden && card.classList.contains('device-card')).length;
  const pending = deviceCards.filter(card => !card.hidden && card.classList.contains('pending-device')).length;
  $('filter-summary').textContent = `${brand} · ${available ? t('flash.available', {count:available}) + (pending ? ` · ${t('flash.pendingCount', {count:pending})}` : '') : t('flash.pending')}`;
  // A hidden choice must not leave an armed image or an old request behind.
  if (model && model.brand !== brand) {
    document.querySelector('input[name="device"]:checked').checked = false;
    model = undefined;
    $('acknowledge').checked = false;
    $('acknowledge').disabled = true;
    resetPrepared();
    $('selected-name').textContent = t('flash.select');
    $('selected-note').textContent = initialSelectionNote;
    $('report-issue').href = 'https://github.com/zhuzhe1983/crossmux/issues/new';
    $('ack-label').textContent = t('flash.ack');
    $('firmware-facts').hidden = true;
    $('download-details').hidden = true;
    $('flasher-panel').hidden = true;
    $('full-download').removeAttribute('href');
    $('app-download').removeAttribute('href');
    setStatus(t('flash.newBrand'));
  }
}));

$('acknowledge').addEventListener('change', () => {
  resetPrepared();
  setStatus($('acknowledge').checked ? t('flash.confirmed') : t('flash.readyConfirm'));
});

$('prepare').addEventListener('click', async () => {
  if (!supported || !model || !$('acknowledge').checked || busy) return;
  resetPrepared();
  const thisGeneration = generation;
  const chosenModel = model;
  request = new AbortController();
  // Capture the controller: an older timeout must never cancel a newer request.
  const controller = request;
  const timeout = setTimeout(() => controller.abort(), 120000);
  $('prepare').disabled = true;
  $('prepare').textContent = t('flash.downloading');
  $('flash-progress').hidden = false;
  $('progress').removeAttribute('value');
  setStatus(t('flash.fetching',{model:chosenModel.model}));
  try {
    const response = await fetch(chosenModel.file, { signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error('HTTP error'), {code:'http',status:response.status});
    const bytes = await response.arrayBuffer();
    await verifyDownload(bytes, chosenModel);
    const { flash } = await import('esp-web-tools/dist/flash.js');
    if (generation !== thisGeneration) return;
    flashFunction = flash;
    verifiedUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    $('prepare').hidden = true;
    $('connect').hidden = false;
    $('connect').disabled = false;
    $('flash-progress').hidden = true;
    setStatus(t('flash.verified'), 'success');
  } catch (error) {
    if (generation !== thisGeneration) return;
    $('prepare').disabled = false;
    $('prepare').textContent = t('flash.retry');
    $('flash-progress').hidden = true;
    setStatus(error.name === 'AbortError' ? t('flash.timeout') : error.code === 'http' ? t('flash.http',{status:error.status}) : t(['truncated','hash'].includes(error.code) ? `flash.${error.code}` : 'flash.failed'), 'error');
  } finally { clearTimeout(timeout); }
});

function lock(locked) {
  busy = locked;
  $('device-choices').disabled = locked;
  $('acknowledge').disabled = locked || !supported;
  $('connect').disabled = locked;
}

$('connect').addEventListener('click', async () => {
  if (busy || !verifiedUrl || !model || !$('acknowledge').checked) return;
  lock(true);
  let port, finalState;
  try {
    // Must run directly inside a user gesture. No port access on page load.
    port = await navigator.serial.requestPort();
    $('flash-progress').hidden = false;
    $('progress').removeAttribute('value');
    setStatus(t('flash.connecting'));
    await flashFunction(event => {
      finalState = event.state;
      switch (event.state) {
        case 'initializing': setStatus(event.details.done ? t('flash.chip',{chip:event.chipFamily}) : t('flash.initializing')); break;
        case 'preparing': setStatus(t('flash.preparing')); break;
        case 'erasing': setStatus(t('flash.erasing')); break;
        case 'writing':
          $('progress').value = event.details.percentage;
          setStatus(t('flash.writing',{model:model.model,percent:event.details.percentage}));
          break;
        case 'finished':
          $('progress').value = 100;
          setStatus(t('flash.finished'), 'success');
          break;
        case 'error': {
          const known = ['failed_initialize', 'not_supported', 'failed_firmware_download', 'write_failed'];
          setStatus(t(known.includes(event.details.error) ? `flash.${event.details.error}` : 'flash.flashError'), 'error');
          break;
        }
      }
    }, port, location.href, flashManifest(model, verifiedUrl), true);
  } catch (error) {
    if (!port && error.name === 'NotFoundError') setStatus(t('flash.cancelled'));
    else if (finalState !== 'error') setStatus(t('flash.connectionError'), 'error');
  } finally {
    // esp-web-tools closes its transport on handled paths; clean up on exceptions too.
    if (port) {
      try { await window.esploader?.transport.disconnect(); } catch { /* Already closed. */ }
      try { await port.close(); } catch { /* Already closed or not open. */ }
      delete window.esploader;
    }
    lock(false);
    if (finalState !== 'finished') $('flash-progress').hidden = true;
    if (finalState === 'finished') {
      $('connect').hidden = true;
      $('acknowledge').checked = false;
      if (verifiedUrl) URL.revokeObjectURL(verifiedUrl);
      verifiedUrl = undefined;
      $('prepare').hidden = false;
      $('prepare').disabled = true;
      $('prepare').textContent = t('flash.prepare');
    }
  }
});

window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
$('copy-wechat').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('rilakkuma_cool'); $('copy-status').textContent = t('contact.copied'); }
  catch { $('copy-status').textContent = t('contact.copyFailed'); }
});
