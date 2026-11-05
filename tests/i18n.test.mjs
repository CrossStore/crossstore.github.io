import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages, translate } from '../src/messages.js';
import { apps, profiles, permissionLabels, capabilityLabels } from '../src/discovery.js';
import { issueLink } from '../src/integrity.js';

const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

test('all translations have matching interpolation contracts and English contains no untranslated CJK', () => {
  for (const [key, entry] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(entry).sort(), ['en', 'zh'], key);
    assert.ok(entry.zh && entry.en, key);
    assert.deepEqual(placeholders(entry.zh), placeholders(entry.en), key);
    assert.doesNotMatch(entry.en, /[\u3400-\u9fff]/, key);
    for (const locale of ['zh', 'en']) {
      const params = Object.fromEntries(placeholders(entry[locale]).map(name => [name, 'example']));
      assert.doesNotMatch(translate(locale, key, params), /\{\w+\}/, key);
    }
  }
  assert.throws(() => translate('en', 'missing.key'));
  assert.throws(() => translate('en', 'flash.fetching'));
});

test('template and runtime catalogs resolve in both locales', async () => {
  const keys = new Set();
  for (const file of ['index.html', 'credits.html']) {
    for (const match of (await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')).matchAll(/\[\[([\w.]+)\]\]/g)) keys.add(match[1]);
  }
  for (const file of ['app.js','home.js']) {
    for (const match of (await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')).matchAll(/\bt\('([\w.]+)'/g)) keys.add(match[1]);
  }
  for (const app of apps) { keys.add(`app.${app.id}`); keys.add(`app.desc.${app.id}`); }
  for (const profile of profiles) keys.add(`profile.${profile.id}`);
  for (const id of Object.keys(permissionLabels)) keys.add(`permission.${id}`);
  for (const id of Object.keys(capabilityLabels)) keys.add(`capability.${id}`);
  for (const key of keys) for (const locale of ['zh','en']) assert.equal(typeof messages[key]?.[locale], 'string', `${locale}: ${key}`);
});

test('English issue feedback retains model/revisions without Chinese interface text', () => {
  const release = {sourceSha:'source123',sdkSha:'sdk456',releaseUrl:'https://example.com/release'};
  for (const available of [true,false]) {
    const url = new URL(issueLink({model:'Ink4 Plus',version:'preview',available},release,'en'));
    const body = url.searchParams.get('body');
    for (const value of ['Ink4 Plus','preview','source123','sdk456',release.releaseUrl]) assert.ok(body.includes(value));
    assert.doesNotMatch(url.searchParams.get('title') + body, /[\u3400-\u9fff]/);
    assert.match(body, available ? /Hardware testing recorded/ : /public firmware pending/);
  }
});
