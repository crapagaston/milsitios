import { randomBytes, createHash } from 'node:crypto';
import { UserError, validate, assign, email, text, sign, verify, publicDraw } from './amigo-core.mjs';
import { personalize } from '../../assets/amigo-modelos.mjs';
export function makeService({ store, env, fetcher = fetch, now = () => Date.now() }) {
  const secret = env.AMIGO_SECRET;
  const hash = s => createHash('sha256').update(s).digest('hex');
  async function quota(key, limit, span = 3600000, amount = 1) {
    key = `limit/${Math.floor(now() / span)}/${hash(key)}`;
    for (let i = 0; i < 6; i++) {
      const old = await store.getWithMetadata(key, { type: 'json' });
      const count = (old?.data?.count || 0) + amount;
      if (count > limit) throw new UserError('Alcanzaste el límite de envíos. Probá más tarde.', 429);
      const saved = await store.setJSON(key, { count, expires: now() + span * 2 }, old ? { onlyIfMatch: old.etag } : { onlyIfNew: true });
      if (saved.modified) return;
    }
    throw new UserError('Hay otra operación en curso. Probá de nuevo.', 409);
  }
  async function mail(messages, key) {
    const response = await fetcher('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(messages.map(m => ({ from: env.AMIGO_FROM, ...m }))), signal: AbortSignal.timeout(18000) });
    if (!response.ok) throw new UserError('El servicio de correo no confirmó el envío. Podés reintentar el mismo envío desde el panel.', 502);
    const result = await response.json();
    if (!Array.isArray(result.data) || result.data.length !== messages.length || result.data.some(m => !m.id)) throw new UserError('No pudimos confirmar todos los correos. Reintentá el envío desde el panel.', 502);
    return result.data.map(m => m.id);
  }
  async function save(code, value, etag) {
    const result = await store.setJSON(`draw/${code}`, value, { onlyIfMatch: etag });
    if (!result.modified) throw new UserError('El sorteo cambió en otra ventana. Actualizá el panel antes de continuar.', 409);
    return result.etag;
  }
  function link(d) { return `${env.AMIGO_SITE_URL}/amigo-invisible#codigo=${d.code}&acceso=${sign(d.code, secret, now())}`; }
  async function accessMail(d) {
    await quota(`access/${d.email}`, 3);
    await quota('all-mail', 1000, 86400000);
    await mail([{ to: [d.email], subject: 'Tu acceso privado a Amigo Invisible · MilSitios', text: `Abrí este enlace para administrar tu sorteo:\n${link(d)}\n\nCódigo: ${d.code}\nEl enlace vence en 7 días. Podés pedir otro con el código y tu correo. No lo compartas: permite administrar participantes y mensajes.\n\nSi no solicitaste este mensaje, ignoralo.` }], `access/${randomBytes(16).toString('hex')}`);
  }
  async function run(body, { token = '', ip = 'unknown' } = {}) {
    if (env.AMIGO_ENABLED !== 'true' || !secret || secret.length < 32 || !env.RESEND_API_KEY || !env.AMIGO_FROM || !/^https:\/\/[^/]+$/.test(env.AMIGO_SITE_URL || '')) throw new UserError('Estamos preparando los envíos de Amigo Invisible. Volvé pronto.', 503);
    const { action } = body;
    if (action === 'status') return { ready: true };
    if (action === 'create') {
      const d = validate(body);
      if (body.consent !== true) throw new UserError('Confirmá que tenés permiso para usar los correos del grupo.');
      await quota(`create/${ip}`, 5);
      await quota('all-create', 100, 86400000);
      const code = randomBytes(8).toString('hex').toUpperCase();
      Object.assign(d, { code, createdAt: now(), revision: 0, history: [], drafts: {}, drawn: false });
      const result = await store.setJSON(`draw/${code}`, d, { onlyIfNew: true });
      if (!result.modified) throw new UserError('No se pudo crear el código. Intentá de nuevo.', 409);
      try { await accessMail(d); } catch { throw new UserError(`El sorteo quedó guardado con el código ${code}, pero no pudimos confirmar tu correo. Usá Recuperar sorteo con ese código y tu correo.`, 502); }
      return { code, message: 'Revisá tu correo: te enviamos el enlace privado para revisar y realizar el sorteo.' };
    }
    const code = typeof body.code === 'string' ? body.code.toUpperCase().replace(/\s/g, '') : '';
    if (!/^[A-F0-9]{16}$/.test(code)) throw new UserError('Revisá el código del sorteo.');
    if (action === 'recover') {
      const address = email(body.email);
      await quota(`recover/${ip}`, 8);
      const old = await store.getWithMetadata(`draw/${code}`, { type: 'json' });
      if (old && old.data.email === address) await accessMail(old.data);
      return { message: 'Si el código y el correo coinciden, recibirás un enlace privado. Revisá también Spam.' };
    }
    if (!verify(token, code, secret, now())) throw new UserError('Tu acceso venció o no es válido. Pedí otro enlace desde Recuperar sorteo.', 401);
    const old = await store.getWithMetadata(`draw/${code}`, { type: 'json' });
    if (!old) throw new UserError('No encontramos el sorteo.', 404);
    const d = old.data;
    if (action === 'get') return publicDraw(d);
    if (body.revision !== d.revision) throw new UserError('Actualizá el panel: el sorteo cambió en otra ventana.', 409);
    if (action === 'retry') {
      if (!d.pending || body.operationId !== d.pending.id) throw new UserError('No hay un envío pendiente con ese identificador.');
      if (now() - d.pending.startedAt > 23 * 3600000) throw new UserError('Pasaron más de 23 horas. Revisá el servicio de correo antes de cerrar el envío pendiente.', 409);
      return deliver(d, old.etag);
    }
    if (action === 'closePending') {
      if (!d.pending || now() - d.pending.startedAt <= 23 * 3600000) throw new UserError('Primero reintentá el envío pendiente.');
      d.history.unshift({ id: d.pending.id, at: now(), subject: d.pending.subject, recipients: d.pending.recipients, state: 'Sin confirmar: revisar antes de reenviar' });
      delete d.pending; d.revision++; await save(code, d, old.etag); return publicDraw(d);
    }
    if (d.pending) throw new UserError('Hay un envío pendiente. Reintentá ese envío antes de modificar el sorteo.', 409);
    if (action === 'edit') {
      d.title = text(body.title, 'el nombre del sorteo', 100);
      d.date = text(body.date, 'la fecha', 40, true); d.budget = text(body.budget, 'el presupuesto', 100, true); d.place = text(body.place, 'el lugar', 160, true);
      if (!Array.isArray(body.participants) || body.participants.length !== d.participants.length) throw new UserError('No se puede modificar la cantidad de participantes.');
      d.participants = d.participants.map((p, i) => ({ ...p, name: text(body.participants[i].name, 'el nombre', 80), email: email(body.participants[i].email) }));
      if (new Set(d.participants.map(p => p.email)).size !== d.participants.length) throw new UserError('Los correos deben ser diferentes.');
      d.revision++; await save(code, d, old.etag); return publicDraw(d);
    }
    if (action === 'draft') {
      d.drafts.message = { subject: text(body.subject, 'el asunto', 180), body: text(body.body, 'el mensaje', 6000) };
      d.revision++; await save(code, d, old.etag); return publicDraw(d);
    }
    if (!['draw', 'resend', 'message', 'test'].includes(action)) throw new UserError('Acción inválida.');
    if (!/^[a-f0-9-]{36}$/i.test(body.operationId || '')) throw new UserError('Falta el identificador del envío.');
    if (d.history.some(h => h.id === body.operationId)) return publicDraw(d);
    let messages, subject, recipients;
    if (action === 'draw' || action === 'resend') {
      if (action === 'draw' && d.drawn) throw new UserError('El sorteo ya se realizó. Podés reenviar las asignaciones.');
      if (action === 'resend' && !d.drawn) throw new UserError('Primero realizá el sorteo.');
      if (!d.drawn) { d.assignments = assign(d.participants.length, d.exclusions); d.drawn = true; }
      recipients = action === 'draw' ? d.participants.map(p => p.id) : [String(body.participantId)];
      if (recipients.some(id => !d.participants.some(p => p.id === id))) throw new UserError('Participante inválido.');
      subject = `Tu amigo invisible · ${d.title}`;
      messages = recipients.map(id => { const i = d.participants.findIndex(p => p.id === id); const p = d.participants[i]; return { to: [p.email], subject, text: `¡Hola, ${p.name}!\n\nEn ${d.title} te tocó regalarle a: ${d.participants[d.assignments[i]].name}.\n\nFecha: ${d.date || 'A confirmar'}\nPresupuesto: ${d.budget || 'A acordar'}\nLugar: ${d.place || 'A confirmar'}\n\n¡Guardá el secreto!\n${d.organizer}\n\nEnviado desde MilSitios por el organizador del sorteo.` }; });
    } else {
      subject = text(body.subject, 'el asunto', 180); const content = text(body.body, 'el mensaje', 6000);
      if (/\{\{\s*(?!nombre\s*\}\}|nombre_sorteo\s*\}\}|fecha\s*\}\}|presupuesto\s*\}\}|lugar\s*\}\}|organizador\s*\}\})/.test(subject + content)) throw new UserError('El mensaje tiene un campo desconocido. Revisá los campos entre llaves.');
      if (action === 'test') { recipients = ['organizer']; messages = [{ to: [d.email], subject: `[Prueba] ${personalize(subject, d, d.participants[0])}`, text: personalize(content, d, d.participants[0]) }]; }
      else {
        if (!Array.isArray(body.recipients) || !body.recipients.length || body.recipients.length > 30) throw new UserError('Elegí al menos un participante.');
        recipients = [...new Set(body.recipients.map(String))];
        messages = recipients.map(id => { const p = d.participants.find(p => p.id === id); if (!p) throw new UserError('Participante inválido.'); return { to: [p.email], subject: personalize(subject, d, p), text: `${personalize(content, d, p)}\n\nEnviado desde MilSitios por el organizador del sorteo.` }; });
      }
    }
    await quota(`send/${code}`, 180, 86400000, messages.length);
    await quota('all-mail', 1000, 86400000, messages.length);
    d.pending = { id: body.operationId, startedAt: now(), subject, recipients, messages }; d.revision++;
    const etag = await save(code, d, old.etag);
    return deliver(d, etag);
  }
  async function deliver(d, etag) {
    let ids;
    try { ids = await mail(d.pending.messages, `draw/${d.code}/${d.pending.id}`); }
    catch (error) { if (error instanceof UserError) throw error; throw new UserError('No pudimos confirmar el envío. Actualizá el panel y reintentá el envío pendiente.', 502); }
    d.history.unshift({ id: d.pending.id, at: now(), subject: d.pending.subject, recipients: d.pending.recipients, state: 'Aceptado por el servicio de correo', providerIds: ids });
    d.history = d.history.slice(0, 100); delete d.pending; d.revision++;
    await save(d.code, d, etag); return publicDraw(d);
  }
  return { run };
}
