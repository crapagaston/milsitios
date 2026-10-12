(() => {
  'use strict';
  const search = document.querySelector('#tool-search');
  const form = document.querySelector('#search-form');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.tool-card')];
  const count = document.querySelector('#result-count');
  const title = document.querySelector('#catalog-title');
  const empty = document.querySelector('#empty-state');
  let category = 'all';
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function update() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    let total = 0;
    cards.forEach(card => {
      const haystack = normalize(card.textContent + ' ' + card.dataset.keywords);
      const match = (category === 'all' || card.dataset.category === category) && words.every(word => haystack.includes(word));
      card.hidden = !match;
      if (match) total++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    const selected = filters.find(button => button.dataset.filter === category);
    title.textContent = words.length ? 'Resultados de tu búsqueda' : category === 'all' ? 'Encontrá tu próxima solución' : selected.textContent.trim();
    count.textContent = `${total} ${total === 1 ? 'herramienta' : 'herramientas'}`;
    empty.hidden = total !== 0;
  }
  search.addEventListener('input', update);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { search.value = ''; update(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); update();
    title.focus({ preventScroll: true });
    document.querySelector('#herramientas').scrollIntoView({ block: 'start' });
  });
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; update(); }));
  document.querySelector('#reset-search').addEventListener('click', () => {
    category = 'all'; search.value = ''; update(); search.focus();
  });
  update();
})();
