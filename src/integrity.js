export async function verifyDownload(buffer, asset, subtle = globalThis.crypto.subtle) {
  if (buffer.byteLength !== asset.bytes) throw new Error('固件下载不完整，请重新校验。');
  const hash = Array.from(new Uint8Array(await subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== asset.sha256) throw new Error('固件校验失败，已阻止刷写。请稍后重试。');
}

export function flashManifest(model, blobUrl) {
  const chips = { papermono: 'ESP32-S3', papers3: 'ESP32-S3', 'waveshare-epaper-397': 'ESP32-S3', 'm5paper-v11': 'ESP32', xteink: 'ESP32-C3', sticky: 'ESP32-S3', x4pro: 'ESP32-S3', x4c: 'ESP32-S3', 'eego-a4': 'ESP32-S3', 'murphy-m4': 'ESP32-S3', 'metalio-eink4': 'ESP32-S3', readpico: 'ESP32-S3', 'lilygo-t5s3': 'ESP32-S3' };
  if (!Object.hasOwn(chips, model.id) || model.chip !== chips[model.id] || !blobUrl.startsWith('blob:')) throw new Error('无效的刷写目标');
  return { name: `CrossStore · ${model.model}`, version: model.version, builds: [{ chipFamily: chips[model.id], parts: [{ path: blobUrl, offset: 0 }] }] };
}

export function issueLink(model, release) {
  const params = new URLSearchParams({
    title: `[${model.available === false ? '适配' : model.experimental ? 'Alpha' : 'Bug'}][${model.model}] 请填写问题摘要`,
    body: `设备 / Model: ${model.model}
验证状态: ${model.available === false ? '待适配，暂无可刷写固件' : model.experimental ? 'Alpha，未经实机测试' : '已有实机测试记录'}
固件 / Firmware: ${model.version}
CrossMux: ${release.sourceSha}
SDK: ${release.sdkSha}
Release: ${release.releaseUrl}

复现步骤 / Steps:
1.

预期表现 / Expected:

实际表现 / Actual:

日志或照片 / Logs or photos:
`,
  });
  return `https://github.com/zhuzhe1983/crossmux/issues/new?${params}`;
}
