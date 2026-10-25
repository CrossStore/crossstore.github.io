export async function verifyDownload(buffer, asset, subtle = globalThis.crypto.subtle) {
  if (buffer.byteLength !== asset.bytes) throw new Error('固件下载不完整，请重新校验。');
  const hash = Array.from(new Uint8Array(await subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== asset.sha256) throw new Error('固件校验失败，已阻止刷写。请稍后重试。');
}

export function flashManifest(model, blobUrl) {
  if (!['papermono', 'papers3', 'waveshare-epaper-397'].includes(model.id) || !blobUrl.startsWith('blob:')) throw new Error('无效的刷写目标');
  return { name: `CrossStore · ${model.model}`, version: model.version, builds: [{ chipFamily: 'ESP32-S3', parts: [{ path: blobUrl, offset: 0 }] }] };
}
