import messages from './messages.json' with { type: 'json' };
export { messages };
export function translate(locale, key, values = {}) {
  const text = messages[key]?.[locale];
  if (typeof text !== 'string') throw new Error(`Missing translation: ${locale}/${key}`);
  return text.replace(/\{(\w+)\}/g, (_, name) => {
    if (!(name in values)) throw new Error(`Missing translation value: ${key}/${name}`);
    return String(values[name]);
  });
}
