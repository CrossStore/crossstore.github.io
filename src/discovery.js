import catalog from './catalog.json' with { type: 'json' };

// Curated website profiles for the current development firmware. The device
// runtime remains authoritative; this preview never grants device permissions.
const shared = ['wifi', 'psram', 'touch', 'storage', 'app_launch', 'photo_library', 'esp_now', 'tox'];
export const profiles = [
  { id: 'papers3', name: 'PaperS3', capabilities: [...shared], summary: '触控阅读 · Wi-Fi · 本地存储' },
  { id: 'papermono', name: 'PaperMono', capabilities: [...shared, 'lora', 'radio_audio'], summary: '触控阅读 · Wi-Fi · LoRa · 蜂鸣器音频' },
  { id: 'ink4-plus', name: 'Ink4 Plus', capabilities: [...shared, 'camera', 'camera_preview', 'radio_audio', 'cellular'], summary: '触控阅读 · Wi-Fi / 4G · 相机 · 音频' },
];
export const permissionLabels = {
  network: '网络访问', reading_data: '阅读记录', files_export: '保存文件', sound: '声音播放',
  radio: '无线通信', camera: '相机', photos: '照片', notifications: '通知', background: '后台运行',
  keep_awake: '保持唤醒', device_info: '设备信息', wallpaper: '壁纸',
};
export const capabilityLabels = { wifi: 'Wi-Fi', touch: '触控', lora: 'LoRa', radio_audio: '音频', camera: '相机', storage: '本地存储' };
const descriptions = {
  weread: '熟悉的书架，安静地读', airtune: '电台与收藏，随手听见', game2048: '数字之间，放松一下',
  gomoku: '黑白落子，自有乐趣', calculator: '随手计算，不必拿起手机', sudoku: '一页九宫格，专注片刻',
  chinese_chess: '楚河汉界，慢慢思考', minesweeper: '点开方格，找出答案', camera: '拍下眼前，留在屏幕里',
  gallery: '在墨水屏上翻看照片', rf_chat: '通过 LoRa，与附近的人聊天', wifi_chat: '联网聊天，保持联系',
  esp_chat: '用 ESP-NOW 发现身边的伙伴', reading_stats: '在日历里，回看每一天的阅读', woodfish: '轻敲一下，留一点安静',
  book_store: '从个人偏好，发现下一本', library: '整理书籍，回到阅读', standby: '让待机的屏幕也有用',
};
const names = { airtune: 'AirTune 电台', rf_chat: 'LoRa 聊天', wifi_chat: 'Wi-Fi 聊天', esp_chat: '近场聊天' };
const featured = ['book_store', 'weread', 'reading_stats', 'rf_chat', 'airtune', 'game2048', 'calculator', 'gallery'];
export const apps = catalog.map(app => ({ ...app, title: names[app.id] || app.name.zh, description: descriptions[app.id] })).sort((a, b) => (featured.includes(a.id) ? featured.indexOf(a.id) : featured.length) - (featured.includes(b.id) ? featured.indexOf(b.id) : featured.length));
export function applicablePermissions(app, profile) {
  return app.permissions.filter(permission => permission !== 'camera' || profile.capabilities.includes('camera'));
}
export function recommendApps({ device = 'papermono', capability = 'all', permissions = Object.keys(permissionLabels) } = {}) {
  const profile = profiles.find(item => item.id === device);
  if (!profile) return { compatible: [], results: [] };
  const compatible = apps.filter(app => app.requires.every(required => profile.capabilities.includes(required)));
  const results = compatible.filter(app => {
    const requirementsMatch = capability === 'all' || (capability === 'offline'
      ? !app.requires.some(required => ['wifi', 'lora', 'esp_now'].includes(required)) && !app.permissions.includes('network')
      : app.requires.includes(capability));
    return requirementsMatch && applicablePermissions(app, profile).every(permission => permissions.includes(permission));
  });
  return { compatible, results };
}
