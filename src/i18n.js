import { translate } from './messages.js';
export const locale = document.documentElement.lang === 'en' ? 'en' : 'zh';
export const t = (key, values) => translate(locale, key, values);
