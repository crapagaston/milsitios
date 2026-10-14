(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pad = $('pad'), total = 5, key = 'milsitios.reflejos.bestAverage.v1';
  let state = 'idle', timer = null, frame = null, started = 0, scores = [], best = null;
  try { const value = Number(localStorage.getItem(key)); if (Number.isFinite(value) && value > 0) best = value; } catch (_) { /* Storage is optional. */ }
  const showBest = () => { $('best').textContent = best === null ? '—' : `${best} ms`; };
  function clearPending() { clearTimeout(timer); cancelAnimationFrame(frame); timer = frame = null; }
  function display(next, title, hint, symbol) {
    state = next; pad.dataset.state = next;
    $('pad-title').textContent = title; $('pad-hint').textContent = hint; $('symbol').textContent = symbol;
    if (next !== 'ready') $('announcement').textContent = `${title}. ${hint}`;
  }
  function renderRounds() {
    $('rounds').replaceChildren(...Array.from({ length: total }, (_, i) => {
      const li = document.createElement('li'), value = document.createElement('strong');
      li.textContent = `Intento ${i + 1}`; value.textContent = scores[i] === undefined ? '—' : `${scores[i]} ms`;
      if (scores[i] !== undefined) li.className = 'done';
      li.append(value); return li;
    }));
  }
  function begin() {
    clearPending();
    $('round').textContent = `Intento ${scores.length + 1} de ${total}`;
    $('cancel').hidden = false;
    display('waiting', 'Esperá el verde…', 'Todavía no. La señal puede tardar un poquito.', '···');
    timer = setTimeout(() => {
      frame = requestAnimationFrame(() => {
        if (state !== 'waiting' || document.hidden) return;
        display('ready', '¡Ahora!', '¡Tocá!', 'ϟ');
        started = performance.now();
      });
    }, 2000 + Math.random() * 3000);
  }
  function finish() {
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / total);
    const record = best === null || average < best;
    if (record) {
      best = average; showBest();
      try { localStorage.setItem(key, String(best)); } catch (_) { /* Keep playing without persistence. */ }
    }
    $('record-label').textContent = record ? '¡Nuevo récord de promedio!' : 'Partida completa';
    $('average').textContent = average;
    $('fastest').textContent = `Tu mejor intento: ${Math.min(...scores)} ms`;
    $('results').hidden = false; $('cancel').hidden = true;
    $('round').textContent = '5 de 5 · ¡Completado!';
    display('finished', `${average} ms de promedio`, 'Partida completa. ¿Vamos por otra?', '✓');
    $('announcement').textContent = `Partida completa. Promedio: ${average} milisegundos. Mejor intento: ${Math.min(...scores)} milisegundos.`;
  }
  function reset() {
    clearPending(); scores = []; renderRounds();
    $('results').hidden = true; $('cancel').hidden = true; $('share-status').textContent = '';
    $('round').textContent = '5 intentos por partida';
    display('idle', '¿Listo para probar?', 'Tocá acá para empezar', 'ϟ');
  }
  function activate() {
    const now = performance.now();
    if (document.hidden) return;
    if (state === 'waiting') { clearPending(); display('early', '¡Te adelantaste!', 'No cuenta. Tocá para repetir este intento.', '↺'); }
    else if (state === 'ready') {
      scores.push(Math.max(1, Math.round(now - started))); renderRounds();
      if (scores.length === total) finish();
      else display('result', `${scores[scores.length - 1]} ms`, 'Tocá para empezar el próximo intento.', '✓');
    } else if (state === 'finished') { reset(); begin(); }
    else begin();
  }
  // Measure on contact, without adding release time; click is reserved for assistive activation.
  pad.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); pad.focus({ preventScroll: true }); activate();
  });
  pad.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) activate(); }
  });
  pad.addEventListener('keyup', event => { if (event.code === 'Space' || event.key === 'Enter') event.preventDefault(); });
  pad.addEventListener('click', event => { if (event.detail === 0) activate(); });
  function pause() {
    if (state === 'waiting' || state === 'ready') { clearPending(); display('paused', 'Hacemos una pausa', 'Tocá para repetir este intento cuando vuelvas.', 'Ⅱ'); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  $('restart').addEventListener('click', () => { reset(); pad.focus(); });
  $('cancel').addEventListener('click', () => { reset(); pad.focus(); });
  $('share').addEventListener('click', async () => {
    const text = `Mi promedio fue ${$('average').textContent} ms en el test de reflejos de MilSitios. ¿Me ganás?`;
    const url = 'https://milsitios.netlify.app/test-de-reflejos.html';
    try {
      if (navigator.share) await navigator.share({ title: 'Test de reflejos · MilSitios', text, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text}\n${url}`); $('share-status').textContent = '¡Resultado y enlace copiados!'; }
      else $('share-status').textContent = `${text} ${url}`;
    } catch (error) { if (error.name !== 'AbortError') $('share-status').textContent = `${text} ${url}`; }
  });
  showBest(); reset();
})();
