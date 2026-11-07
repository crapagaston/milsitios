import { templates, modelFor, personalize } from './amigo-modelos.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let people = [{name:'',email:''},{name:'',email:''},{name:'',email:''}], exclusions = [], draw, token = '', code = '', busy = false, reviewed = null;
function feedback(message, error = false) { $('feedback').textContent = message; $('feedback').classList.toggle('error', error); if (message) $('feedback').focus(); }
async function api(action, payload = {}) {
  const response = await fetch('/api/amigo-invisible', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action, code, revision: draw?.revision, ...payload }) });
  let data; try { data = await response.json(); } catch { throw new Error('El servicio todavía no está disponible. Intentá más tarde.'); }
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.'); return data;
}
async function task(fn) {
  if (busy) return; busy = true; feedback('');
  const buttons = [...document.querySelectorAll('button')]; const states = buttons.map(b => b.disabled); buttons.forEach(b => { b.disabled = true; });
  try { await fn(); } catch (e) { feedback(e.message || 'No pudimos completar la operación.', true); }
  finally { busy = false; buttons.forEach((b, i) => { if (b.isConnected) b.disabled = states[i]; }); if (draw?.busy) document.querySelectorAll('#edit-form input, #edit-form button, #message-form button, #draw-button, [data-resend]').forEach(b => { b.disabled = true; }); }
}
function view(name) { ['create','recover','models'].forEach(v => { $(`${v}-view`).hidden = v !== name; document.querySelector(`[data-view="${v}"]`).setAttribute('aria-pressed', String(v === name)); }); feedback(''); }
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(b.dataset.view)));
function collectPeople() { people = [...$('participants').children].map(row => ({ name: row.querySelector('[data-name]').value, email: row.querySelector('[data-email]').value })); }
function renderPeople() {
  $('participants').innerHTML = people.map((p, i) => `<div class="person-row"><span class="person-number">${i+1}</span><label><span class="muted">Nombre</span><input data-name aria-label="Nombre del participante ${i+1}" value="${esc(p.name)}" required maxlength="80"></label><label><span class="muted">Correo</span><input data-email aria-label="Correo del participante ${i+1}" type="email" value="${esc(p.email)}" required maxlength="254"></label><button type="button" class="remove-person" data-remove="${i}" aria-label="Quitar participante ${i+1}">×</button></div>`).join('');
  $('add-person').disabled = people.length >= 30;
  $('exclusions').innerHTML = exclusions.map(([a,b], i) => `<li>Persona ${a+1} ↔ Persona ${b+1}<button type="button" class="secondary" data-exclusion="${i}">Quitar</button></li>`).join('');
}
$('participants').addEventListener('click', e => { const b = e.target.closest('[data-remove]'); if (!b) return; if (people.length <= 3) return feedback('Se necesitan al menos 3 participantes.', true); collectPeople(); const i = +b.dataset.remove; people.splice(i,1); exclusions = exclusions.filter(pair => !pair.includes(i)).map(pair => pair.map(n => n > i ? n-1:n)); renderPeople(); });
$('add-person').onclick = () => { collectPeople(); people.push({name:'',email:''}); renderPeople(); $('participants').lastElementChild.querySelector('input').focus(); };
$('add-exclusion').onclick = () => { const a = +$('exclude-a').value-1, b = +$('exclude-b').value-1; if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= people.length || b >= people.length || a === b) return feedback('Elegí dos números diferentes que correspondan a participantes.', true); if (!exclusions.some(pair => pair.includes(a) && pair.includes(b))) exclusions.push([a,b]); collectPeople(); renderPeople(); feedback('Restricción agregada.'); };
$('exclusions').onclick = e => { const b = e.target.closest('[data-exclusion]'); if (b) { exclusions.splice(+b.dataset.exclusion,1); collectPeople(); renderPeople(); } };
$('create-form').onsubmit = e => { e.preventDefault(); task(async () => { collectPeople(); const values = Object.fromEntries(new FormData(e.target)); const result = await api('create', { ...values, participants: people, exclusions, consent: true }); feedback(`Código: ${result.code}. ${result.message}`); $('recover-form').elements.code.value = result.code; }); };
$('recover-form').onsubmit = e => { e.preventDefault(); task(async () => feedback((await api('recover', Object.fromEntries(new FormData(e.target)))).message)); };
function fillModels(select) { select.innerHTML = Object.entries(templates).map(([key,t]) => `<option value="${key}">${esc(t.name)}</option>`).join(''); }
fillModels($('sample-template')); fillModels($('message-template'));
function sample() { const t = modelFor($('sample-template').value, $('sample-occasion').value); $('sample-subject').textContent = t.subject; $('sample-body').textContent = t.body; }
$('sample-template').onchange = sample; $('sample-occasion').onchange = sample; sample(); renderPeople();
function loadModel() { const t = modelFor($('message-template').value, draw.occasion); $('message-subject').value = t.subject; $('message-body').value = t.body; }
$('message-template').onchange = () => { if (confirm('¿Reemplazar el texto del editor por este modelo? Los cambios sin guardar se perderán.')) loadModel(); };
function renderAdmin(preserveMessage = true) {
  $('entry').hidden = true; $('admin').hidden = false; $('admin-title').textContent = draw.title; $('draw-code').textContent = draw.code; $('draw-state').textContent = draw.drawn ? 'Sorteo realizado' : 'Listo para sortear';
  ['title','date','budget','place'].forEach(k => { $('edit-form').elements[k].value = draw[k] || ''; });
  $('assignment-note').textContent = draw.drawn ? 'Las asignaciones se conservan. Podés corregir nombres y correos.' : 'Revisá nombres y correos antes de realizar el sorteo. Para cambiar la cantidad o las restricciones, creá un nuevo sorteo.';
  $('admin-people').innerHTML = draw.participants.map(p => `<div class="admin-person" data-id="${esc(p.id)}"><label>Nombre<input data-name value="${esc(p.name)}" required maxlength="80"></label><label>Correo<input data-email type="email" value="${esc(p.email)}" required maxlength="254"></label>${draw.drawn ? `<button type="button" class="secondary" data-resend="${esc(p.id)}">Reenviar resultado</button>` : ''}</div>`).join('');
  const selected = new Set([...document.querySelectorAll('[name="recipient"]:checked')].map(c => c.value));
  $('message-recipients').innerHTML = draw.participants.map(p => `<label class="check"><input name="recipient" type="checkbox" value="${esc(p.id)}" ${!preserveMessage || selected.has(p.id) ? 'checked':''}><span>${esc(p.name)} · ${esc(p.email)}</span></label>`).join('');
  $('draw-button').hidden = draw.drawn; $('pending-box').hidden = !draw.busy; $('retry').hidden = !draw.busy || Date.now() - draw.pendingStartedAt > 23*3600000; $('close-pending').hidden = $('retry').hidden === false || !draw.busy;
  if (!preserveMessage) { if (draw.drafts?.message) { $('message-subject').value = draw.drafts.message.subject; $('message-body').value = draw.drafts.message.body; } else loadModel(); }
  $('history').innerHTML = draw.history.length ? draw.history.map(h => `<div class="history-item"><strong>${esc(h.subject)}</strong><p class="muted">${esc(new Date(h.at).toLocaleString('es-AR'))} · ${h.recipients.length} destinatario(s)</p><p>${esc(h.state)}</p></div>`).join('') : '<p class="muted">Todavía no hay envíos al grupo.</p>';
  for (const el of document.querySelectorAll('#edit-form input, #edit-form button, #message-form button, #draw-button, [data-resend]')) el.disabled = draw.busy;
}
async function refresh(preserve = true) { draw = await api('get'); renderAdmin(preserve); }
$('refresh').onclick = () => task(() => refresh());
$('edit-form').onsubmit = e => { e.preventDefault(); task(async () => { const participants = [...$('admin-people').children].map(row => ({name:row.querySelector('[data-name]').value,email:row.querySelector('[data-email]').value})); draw = await api('edit', {...Object.fromEntries(new FormData(e.target)),participants}); renderAdmin(); feedback('Cambios guardados. No se enviaron correos.'); }); };
$('draw-button').onclick = () => { if (!confirm(`¿Realizar el sorteo y enviar ${draw.participants.length} correos? Después no se podrá volver a sortear este grupo.`)) return; send('draw'); };
$('admin-people').onclick = e => { const b = e.target.closest('[data-resend]'); if (!b) return; const p = draw.participants.find(p => p.id === b.dataset.resend); if (confirm(`¿Reenviar la asignación original a ${p.name} (${p.email})? Si editaste el correo, guardá los cambios primero.`)) send('resend', {participantId:p.id}); };
async function send(action, payload = {}) {
  await task(async () => {
    try { draw = await api(action, {operationId:crypto.randomUUID(),...payload}); renderAdmin(); feedback('Envío aceptado por el servicio de correo. Podés consultar el historial.'); }
    catch (e) { try { await refresh(); } catch {} throw e; }
  });
}
$('retry').onclick = () => send('retry', {operationId:draw.pendingId});
$('close-pending').onclick = () => { if (confirm('¿Cerrar este envío como “sin confirmar”? Revisá Resend primero: algunos correos pueden haberse enviado. Un reenvío posterior podría duplicarlos.')) task(async () => { draw = await api('closePending'); renderAdmin(); feedback('Envío registrado como sin confirmar.'); }); };
function message() { return {subject:$('message-subject').value,body:$('message-body').value,recipients:[...document.querySelectorAll('[name="recipient"]:checked')].map(c=>c.value)}; }
$('select-all').onclick = () => { const boxes = [...document.querySelectorAll('[name="recipient"]')]; const all = boxes.every(c=>c.checked); boxes.forEach(c => { c.checked = !all; }); };
$('save-draft').onclick = () => task(async () => { draw = await api('draft',message()); renderAdmin(); feedback('Borrador guardado en el sorteo.'); });
function review(willSend) {
  const m = message(); if (!m.subject.trim() || !m.body.trim()) return feedback('Completá el asunto y el mensaje.',true);
  if (willSend && !m.recipients.length) return feedback('Elegí al menos un destinatario.',true);
  const first = draw.participants.find(p=>m.recipients.includes(p.id)) || draw.participants[0]; reviewed = structuredClone(m);
  $('review-title').textContent = willSend ? 'Revisá antes de enviar' : 'Vista previa';
  $('review-recipients').textContent = `Ejemplo para ${first.name}. ${willSend ? `Se enviará individualmente a ${m.recipients.length} persona(s): ${draw.participants.filter(p=>m.recipients.includes(p.id)).map(p=>p.name).join(', ')}.`:''}`;
  $('review-subject').textContent = personalize(m.subject,draw,first); $('review-body').textContent = personalize(m.body,draw,first); $('review-send').hidden = !willSend; $('review-dialog').showModal();
}
$('preview-message').onclick = () => review(false); $('message-form').onsubmit = e => {e.preventDefault();review(true);}; $('review-cancel').onclick = () => $('review-dialog').close();
$('review-send').onclick = () => { $('review-dialog').close(); send('message',reviewed); };
$('test-message').onclick = () => send('test',message());
$('logout').onclick = () => { token='';code='';draw=null;location.hash='';location.reload(); };
// Keep the private access token in memory only. Remove it from the address bar immediately.
const hash = new URLSearchParams(location.hash.slice(1)); token = hash.get('acceso') || ''; code = hash.get('codigo') || ''; if (location.hash) history.replaceState(null,'',location.pathname);
if (token && code) task(async () => { try { await refresh(false); } catch(e) { view('recover'); $('recover-form').elements.code.value=code; token=''; throw e; } });
else api('status').catch(() => { $('notice').textContent='Los envíos están en preparación. Podés explorar los modelos de mensajes; la creación y recuperación se habilitarán cuando esté configurado el correo.'; $('notice').hidden=false; $('create-submit').disabled=true; $('recover-submit').disabled=true; });
