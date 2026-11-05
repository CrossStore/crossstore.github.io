import test from 'node:test';
import assert from 'node:assert/strict';
import { apps, profiles, permissionLabels, recommendApps } from '../src/discovery.js';

test('hardware requirements exclude unsupported radio, camera and audio apps', () => {
  const ids = device => recommendApps({ device }).results.map(app => app.id);
  assert.ok(ids('papermono').includes('rf_chat'));
  assert.ok(!ids('papers3').includes('rf_chat'));
  for (const device of ['papers3', 'papermono']) {
    assert.ok(!ids(device).includes('camera'));

  }
  assert.ok(!ids('papers3').includes('airtune'));
  assert.ok(ids('papermono').includes('airtune'));
  assert.ok(ids('ink4-plus').includes('camera'));
  assert.ok(ids('ink4-plus').includes('airtune'));
  assert.deepEqual(recommendApps({ device: 'unknown' }).results, []);
});

test('capability AND permissions are enforced without hiding supported optional camera chat', () => {
  const without = permission => Object.keys(permissionLabels).filter(value => value !== permission);
  assert.ok(!recommendApps({ device: 'ink4-plus', capability: 'camera', permissions: without('camera') }).results.length);
  assert.ok(!recommendApps({ device: 'papermono', capability: 'wifi', permissions: without('network') }).results.some(app => app.id === 'weread'));
  // Camera is declared by chat, but does not apply to a device without it.
  assert.ok(recommendApps({ device: 'papermono', capability: 'lora', permissions: without('camera') }).results.some(app => app.id === 'rf_chat'));
  assert.ok(!recommendApps({ device: 'papermono', capability: 'lora', permissions: without('radio') }).results.length);
  for (const profile of profiles) {
    const results = recommendApps({ device: profile.id, permissions: [] }).results;
    assert.ok(results.some(app => app.id === 'game2048'));
    assert.ok(!results.some(app => app.id === 'reading_stats'));
  }
});

test('offline results do not require Wi-Fi, radio or network permission', () => {
  for (const profile of profiles) {
    const { results } = recommendApps({ device: profile.id, capability: 'offline' });
    assert.ok(results.some(app => app.id === 'calculator'));
    assert.ok(results.every(app => !app.requires.some(capability => ['wifi', 'lora', 'esp_now'].includes(capability)) && !app.permissions.includes('network')));
  }
});

test('curated metadata has no unknown permission that the preview could grant implicitly', () => {
  assert.equal(new Set(apps.map(app => app.id)).size, apps.length);
  for (const app of apps) {
    assert.ok(app.permissions.every(permission => Object.hasOwn(permissionLabels, permission)));
    assert.ok(app.source.startsWith('https://github.com/CrossStore/CrossStore/tree/main/packages/'));
  }
});
