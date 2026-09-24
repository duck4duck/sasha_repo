const state = { categories: [], promotions: [], tariffs: [], view: 'cards' };
const $ = (selector) => document.querySelector(selector);
const api = async (url) => { const response = await fetch(url); if (!response.ok) throw new Error('Ошибка загрузки'); return response.json(); };
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const formatDate = (date) => date ? new Intl.DateTimeFormat('ru-RU').format(new Date(`${date}T00:00:00`)) : 'не указан';
const selectedCategoryIds = () => [...document.querySelectorAll('.chip.selected')].map((item) => item.dataset.id);
const status = () => document.querySelector('input[name="clientStatus"]:checked').value;

function query() {
  const params = new URLSearchParams(); const clientType = $('#clientType').value;
  if (clientType) params.set('clientType', clientType); if (status()) params.set('isNew', status());
  if (status() !== 'true' && $('#years').value) params.set('years', $('#years').value);
  if ($('#retention').checked) params.set('retention', 'true');
  const categories = selectedCategoryIds(); if (categories.length) params.set('categoryIds', categories.join(','));
  if ($('#tariff').value) params.set('tariffId', $('#tariff').value); return params;
}

function renderCategories() { $('#categories').innerHTML = state.categories.map((category) => `<button class="chip" data-id="${category.id}" data-type="${category.client_type}">${escapeHtml(category.name)}</button>`).join(''); }
function renderTariffOptions() {
  const ids = selectedCategoryIds(); const tariffs = ids.length ? state.tariffs.filter((tariff) => ids.includes(String(tariff.category_id))) : state.tariffs;
  const current = $('#tariff').value; $('#tariff').innerHTML = '<option value="">Все тарифы</option>' + tariffs.map((tariff) => `<option value="${tariff.id}">${escapeHtml(tariff.name)} — ${escapeHtml(tariff.category)}</option>`).join('');
  if ([...$('#tariff').options].some((option) => option.value === current)) $('#tariff').value = current;
}
function info(label, value) { return value ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : ''; }
function renderPromotions() {
  const root = $('#promotionResults'); root.className = `promotion-grid ${state.view === 'table' ? 'table' : ''}`;
  $('#count').textContent = `${state.promotions.length} ${plural(state.promotions.length, 'акция', 'акции', 'акций')} найдено`;
  if (!state.promotions.length) { root.innerHTML = '<div class="empty">По выбранным параметрам акции не найдены.</div>'; return; }
  root.innerHTML = '';
  state.promotions.forEach((promotion) => {
    const node = $('#promotionTemplate').content.cloneNode(true); const card = node.querySelector('.promotion-card');
    node.querySelector('.number').textContent = promotion.number_code; node.querySelector('.discount').textContent = promotion.discount_percent ? `Скидка ${promotion.discount_percent}%${promotion.discount_schedule ? ' *' : ''}` : 'Специальные условия'; node.querySelector('h2').textContent = promotion.name;
    node.querySelector('.meta').textContent = `${promotion.categories || 'Без категории'} · ${formatDate(promotion.start_date)} — ${formatDate(promotion.end_date)}`;
    node.querySelector('.summary').textContent = promotion.description || 'Описание отсутствует.';
    const details = node.querySelector('.details'); details.innerHTML = info('Размер и срок скидки', promotion.discount_schedule || (promotion.duration_months ? `${promotion.discount_percent}% на ${promotion.duration_months} мес.` : 'уточняйте условия')) + info('Подходящие тарифы', promotion.tariffs) + info('Кому доступна', promotion.allowed_conditions) + info('Ограничения', promotion.restricted_conditions) + info('Обязательства', promotion.legal_obligations);
    const button = node.querySelector('.details-button'); button.addEventListener('click', () => { details.hidden = !details.hidden; button.textContent = details.hidden ? 'Подробнее' : 'Свернуть'; }); root.append(card);
  });
}
function plural(number, one, few, many) { const n = number % 100; if (n > 10 && n < 20) return many; const last = number % 10; return last === 1 ? one : last >= 2 && last <= 4 ? few : many; }
async function loadPromotions() { try { state.promotions = await api(`/api/promotions?${query()}`); renderPromotions(); } catch { $('#promotionResults').innerHTML = '<div class="empty">Не удалось загрузить данные. Проверьте запуск сервера и подключение к MySQL.</div>'; } }
function applyClientType() { const type = $('#clientType').value; document.querySelectorAll('.chip').forEach((chip) => { chip.hidden = Boolean(type && chip.dataset.type !== type); if (chip.hidden) chip.classList.remove('selected'); }); renderTariffOptions(); loadPromotions(); }
function bind() {
  $('#clientType').addEventListener('change', applyClientType); document.querySelectorAll('input[name="clientStatus"]').forEach((input) => input.addEventListener('change', () => { const fresh = status() === 'true'; $('#years').value = fresh ? 0 : $('#years').value; $('#years').disabled = fresh; loadPromotions(); }));
  $('#years').addEventListener('change', loadPromotions); $('#retention').addEventListener('change', loadPromotions); $('#tariff').addEventListener('change', loadPromotions);
  $('#categories').addEventListener('click', (event) => { if (!event.target.matches('.chip')) return; event.target.classList.toggle('selected'); renderTariffOptions(); loadPromotions(); });
  document.querySelectorAll('.view-switch button').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; document.querySelectorAll('.view-switch button').forEach((item) => item.classList.toggle('selected', item === button)); renderPromotions(); }));
  $('#reset').addEventListener('click', () => { $('#clientType').value = ''; document.querySelector('input[name="clientStatus"][value=""]').checked = true; $('#years').value = 0; $('#years').disabled = false; $('#retention').checked = false; document.querySelectorAll('.chip').forEach((chip) => { chip.hidden = false; chip.classList.remove('selected'); }); renderTariffOptions(); loadPromotions(); });
  document.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', () => { document.querySelectorAll('nav a').forEach((item) => item.classList.toggle('active', item === link)); document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', `#${page.id}` === link.getAttribute('href'))); }));
}
async function init() { try { [state.categories, state.tariffs] = await Promise.all([api('/api/categories'), api('/api/tariffs')]); renderCategories(); renderTariffOptions(); bind(); loadPromotions(); $('#tariffResults').innerHTML = state.tariffs.map((tariff) => `<article class="tariff-card"><span class="discount">${escapeHtml(tariff.category)}</span><h2>${escapeHtml(tariff.name)}</h2><p>${tariff.base_price ? `${tariff.base_price} руб.` : 'Стоимость уточняется'}${tariff.is_archived ? ' · Архивный' : ''}</p></article>`).join(''); } catch { $('#promotionResults').innerHTML = '<div class="empty">Не удалось загрузить справочник. Импортируйте базу и проверьте файл .env.</div>'; } }
init();
