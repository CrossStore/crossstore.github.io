import { t, locale } from './i18n.js';
import { apps, profiles, permissionLabels, capabilityLabels, applicablePermissions, recommendApps } from './discovery.js';

const $ = id => document.getElementById(id);
const icon = (id, app = false) => `<img src="/assets/${app ? 'app-icons' : 'ui'}/${id}.svg" width="22" height="22" alt="">`;
// Only local, curated metadata reaches these templates. There is no remote HTML.
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const state = { device: 'papermono', capability: 'all', permissions: Object.keys(permissionLabels) };
let appsExpanded = false;

function renderApps() {
  const profile = profiles.find(item => item.id === state.device);
  const { compatible, results } = recommendApps(state);
  $('device-capabilities').textContent = t(`profile.${profile.id}`);
  $('recommendation-path').innerHTML = `<span>${t('apps.total',{count:apps.length})}</span><em aria-hidden="true">→</em><span>${t('apps.compatible',{model:profile.name,count:compatible.length})}</span><em aria-hidden="true">→</em><strong class="result-count">${t('apps.available',{count:results.length})}</strong>`;
  $('app-more').hidden = results.length <= 8;
  $('toggle-apps').textContent = appsExpanded ? t('apps.collapse') : t('apps.expand',{count:results.length});
  $('toggle-apps').setAttribute('aria-expanded', String(appsExpanded));
  $('app-results').innerHTML = (appsExpanded ? results : results.slice(0, 8)).map(app => {
    const capabilities = app.requires.filter(item => capabilityLabels[item]).map(item => t(`capability.${item}`));
    const permissions = applicablePermissions(app, profile).map(item => t(`permission.${item}`));
    const title=t(`app.${app.id}`), description=t(app.id === 'airtune' && profile.id === 'papermono' ? 'apps.buzzer' : `app.desc.${app.id}`);
    const permissionText = permissions.length ? t('apps.requires',{permissions:permissions.join(locale==='en'?', ':'、')}) : t('apps.noPermissions');
    return `<a class="app-card" data-app-id="${app.id}" href="${escape(app.source)}" aria-label="${escape(t('apps.accessible',{title,description,permissions:permissionText}))}"><span class="app-icon">${icon(app.id,true)}</span><span class="app-copy"><strong>${escape(title)}</strong><small>${escape(description)}</small><span class="app-requirement">${escape(capabilities.length?capabilities.join(' / '):t('apps.basic'))} · ${permissions.length?t(permissions.length === 1 ? 'apps.permissionCount.one' : 'apps.permissionCount',{count:permissions.length}):t('apps.noPermissions')}</span></span><span class="app-arrow" aria-hidden="true">↗</span></a>`;
  }).join('');
  $('empty-results').hidden = results.length !== 0;
  $('permission-summary').textContent = state.permissions.length === Object.keys(permissionLabels).length ? t('apps.allPermissions') : t('apps.somePermissions',{count:state.permissions.length,total:Object.keys(permissionLabels).length});
  document.querySelectorAll('[data-app-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.appDevice === state.device)));
  document.querySelectorAll('[data-capability]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.capability === state.capability)));
}
$('permission-options').innerHTML = Object.keys(permissionLabels).map(id => `<label><input type="checkbox" value="${id}" checked>${t(`permission.${id}`)}</label>`).join('');
document.querySelectorAll('[data-app-device]').forEach(button => button.addEventListener('click', () => { state.device = button.dataset.appDevice; appsExpanded = false; renderApps(); }));
document.querySelectorAll('[data-capability]').forEach(button => button.addEventListener('click', () => { state.capability = button.dataset.capability; appsExpanded = false; renderApps(); }));
$('toggle-apps').addEventListener('click', () => { appsExpanded = !appsExpanded; renderApps(); });
$('permission-options').addEventListener('change', () => {
  appsExpanded = false;
  state.permissions = [...$('permission-options').querySelectorAll('input:checked')].map(input => input.value);
  renderApps();
});
$('reset-app-filters').addEventListener('click', () => {
  appsExpanded = false; state.capability = 'all'; state.permissions = Object.keys(permissionLabels);
  $('permission-options').querySelectorAll('input').forEach(input => { input.checked = true; });
  renderApps();
  document.querySelector('[data-capability="all"]').focus();
});
renderApps();

const books = {scifi:['59552','34966','41888'],literature:['47916','35539','42775']};
function renderBooks(topic) {
  $('book-shelf').innerHTML = books[topic].map(id => {
    const title=t(`book.title.${id}`),author=t(`book.author.${id}`);
    return `<figure><div class="book-cover"><img src="/assets/books/${id}.bmp" width="112" height="164" alt="${escape(t('book.cover',{title}))}" loading="lazy"></div><figcaption><strong>${escape(title)}</strong><small>${escape(author)}</small></figcaption></figure>`;
  }).join('');
  $('book-reason').textContent=t(`book.reason.${topic}`);
  document.querySelector('.book-selection-foot span:last-child').textContent=topic==='scifi'?'01 / 02':'02 / 02';
  document.querySelectorAll('[data-book-topic]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bookTopic===topic)));
}
document.querySelectorAll('[data-book-topic]').forEach(button => button.addEventListener('click', () => renderBooks(button.dataset.bookTopic)));
renderBooks('scifi');

const menuOptions = [
  { id: 'shelf', icon: 'book' }, { id: 'calendar', icon: 'calendar' },
  { id: 'apps', icon: 'apps' }, { id: 'settings', icon: 'settings' },
  { id: 'bookstore', icon: 'store' },
  { id: 'weread', icon: 'weread', app: true }, { id: 'game2048', icon: 'game2048', app: true },
  { id: 'files', icon: 'files' },
];
const defaultMenu = ['shelf', 'calendar', 'apps', 'settings'];
let menu = [...defaultMenu];
function renderMenu(message = '') {
  $('menu-items').innerHTML = menu.map((id, index) => {
    const item = menuOptions.find(option => option.id === id), name=t(`menu.${id}`);
    return `<li data-menu-id="${id}"><span class="menu-number">0${index + 1}</span>${icon(item.icon, item.app)}<span class="menu-item-name">${name}</span><div class="menu-tools"><button type="button" data-menu-action="up" aria-label="${escape(t('menu.up',{name}))}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-menu-action="down" aria-label="${escape(t('menu.down',{name}))}" ${index === menu.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-menu-action="remove" aria-label="${escape(t('menu.remove',{name}))}" ${menu.length === 1 ? 'disabled' : ''}>×</button></div></li>`;
  }).join('');
  $('menu-choice').innerHTML = menuOptions.filter(item => !menu.includes(item.id)).map(item => `<option value="${item.id}">${t(`menu.${item.id}`)}</option>`).join('');
  $('menu-choice').disabled = menu.length >= 5;
  $('add-menu').disabled = menu.length >= 5;
  $('menu-preview').innerHTML = menu.map(id => {
    const item = menuOptions.find(option => option.id === id), name=t(`menu.${id}`);
    return `<span>${icon(item.icon, item.app)}${name}</span>`;
  }).join('');
  $('menu-status').textContent = message || t('menu.count',{count:menu.length});
}
$('menu-items').addEventListener('click', event => {
  const button = event.target.closest('[data-menu-action]');
  if (!button || button.disabled) return;
  const id = button.closest('[data-menu-id]').dataset.menuId;
  const index = menu.indexOf(id), action = button.dataset.menuAction;
  if (action === 'remove' && menu.length > 1) menu.splice(index, 1);
  else {
    const next = index + (action === 'up' ? -1 : 1);
    if (next < 0 || next >= menu.length) return;
    [menu[index], menu[next]] = [menu[next], menu[index]];
  }
  renderMenu(t('menu.updated',{count:menu.length}));
  const row = $('menu-items').querySelector(`[data-menu-id="${id}"]`);
  const preferred = row?.querySelector(`[data-menu-action="${action}"]:not(:disabled)`);
  (preferred || row?.querySelector('button:not(:disabled)') || $('menu-items').querySelector('button:not(:disabled)') || $('reset-menu')).focus();
});
$('add-menu').addEventListener('click', () => {
  const id = $('menu-choice').value;
  if (menu.length >= 5 || menu.includes(id) || !menuOptions.some(item => item.id === id)) return;
  menu.push(id); renderMenu(t('menu.added',{name:t(`menu.${id}`),count:menu.length}));
  $('menu-items').lastElementChild.querySelector('button:not(:disabled)').focus();
});
$('reset-menu').addEventListener('click', () => { menu = [...defaultMenu]; renderMenu(t('menu.restored')); });
renderMenu();
