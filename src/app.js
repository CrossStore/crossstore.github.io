import { verifyDownload, flashManifest } from './integrity.js';

const { models } = JSON.parse(document.querySelector('#site-data').textContent);
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
  $('prepare').textContent = '下载并校验固件 ↓';
};

$('browser-note').textContent = supported
  ? '浏览器支持 Web Serial。准备好数据线，并关闭占用设备的串口工具。'
  : '当前浏览器不支持 USB 刷写。请用电脑上的 Chrome / Edge 打开本站；你仍可下载镜像。';

document.querySelectorAll('input[name="device"]').forEach(input => input.addEventListener('change', () => {
  model = models.find(d => d.id === input.value);
  $('acknowledge').checked = false;
  $('acknowledge').disabled = !supported;
  resetPrepared();
  $('selected-name').textContent = model.model;
  $('selected-note').textContent = model.note;
  $('ack-label').textContent = `我确认设备是 ${model.model}，已备份并同意清除设备内部的原固件和设置。`;
  $('firmware-version').textContent = model.version;
  $('firmware-size').textContent = `${(model.bytes / 1024 / 1024).toFixed(2)} MiB`;
  $('firmware-facts').hidden = false;
  $('download-details').hidden = false;
  $('checksum').textContent = model.sha256;
  $('full-download').href = model.file;
  $('app-download').href = `/firmware/${model.id}-firmware.bin`;
  setStatus(supported ? '请确认型号与备份，再下载固件。' : '已显示该机型的下载文件，可使用本地刷机工具。');
}));

$('acknowledge').addEventListener('change', () => {
  resetPrepared();
  setStatus($('acknowledge').checked ? '已确认。下一步下载并校验固件，尚不会连接设备。' : '请确认型号与备份，再下载固件。');
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
  $('prepare').textContent = '正在下载与校验…';
  $('flash-progress').hidden = false;
  $('progress').removeAttribute('value');
  setStatus(`正在获取 ${chosenModel.model} 固件，网络较慢时请稍候。`);
  try {
    const response = await fetch(chosenModel.file, { signal: controller.signal });
    if (!response.ok) throw new Error(`下载失败（HTTP ${response.status}），请重试。`);
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
    setStatus('SHA-256 校验通过。下一步选择 USB 串口，将立即清除内部闪存并刷写。', 'success');
  } catch (error) {
    if (generation !== thisGeneration) return;
    $('prepare').disabled = false;
    $('prepare').textContent = '重新下载并校验 ↻';
    $('flash-progress').hidden = true;
    setStatus(error.name === 'AbortError' ? '下载超时，请检查网络后重试。' : error.message, 'error');
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
    setStatus('正在连接设备。完整刷写期间请勿断开 USB 或关闭页面。');
    await flashFunction(event => {
      finalState = event.state;
      switch (event.state) {
        case 'initializing': setStatus(event.details.done ? `已识别 ${event.chipFamily}，正在检查支持情况。` : '正在进入下载模式；连接失败请参考下方说明。'); break;
        case 'preparing': setStatus('正在准备已校验的固件。请保持连接。'); break;
        case 'erasing': setStatus('正在清除设备内部闪存。请勿断开连接。'); break;
        case 'writing':
          $('progress').value = event.details.percentage;
          setStatus(`正在刷写 ${model.model} · ${event.details.percentage}%`);
          break;
        case 'finished':
          $('progress').value = 100;
          setStatus('固件已写入。请正常重启设备，再打开「应用 → 应用商店」。若仍在下载模式，请按设备说明退出后开机。', 'success');
          break;
        case 'error': {
          const messages = { failed_initialize: '无法进入下载模式。请检查数据线、串口占用，并按下方说明重试。', not_supported: '检测到不支持的芯片，已阻止刷写。请核对设备。', failed_firmware_download: '无法读取已校验的固件，请重新下载。', write_failed: '写入失败，请检查连接并重新完整刷写；此时设备可能无法正常启动。' };
          setStatus(messages[event.details.error] || '刷写失败，请检查连接后重试。', 'error');
          break;
        }
      }
    }, port, location.href, flashManifest(model, verifiedUrl), true);
  } catch (error) {
    if (!port && error.name === 'NotFoundError') setStatus('已取消选择端口，未开始刷写。');
    else if (finalState !== 'error') setStatus('连接或刷写失败。请检查设备与 USB 线后重试；如已开始擦除，需要重新完整刷写。', 'error');
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
      $('prepare').textContent = '下载并校验固件 ↓';
    }
  }
});

window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
$('copy-wechat').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('rilakkuma_cool'); $('copy-status').textContent = '已复制微信号'; }
  catch { $('copy-status').textContent = '请长按或选中上方微信号复制'; }
});
