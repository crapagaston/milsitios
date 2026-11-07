import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
export class UserError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function text(value, name, max = 160, optional = false) {
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(value)) throw new UserError(`Revisá ${name}.`);
  return value.trim();
}
export function email(value) {
  const e = text(value, 'el correo', 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e) || /[\r\n]/.test(e)) throw new UserError('Ingresá un correo válido.');
  return e;
}
export function validate(input) {
  const d = { title: text(input.title, 'el nombre del sorteo', 100), organizer: text(input.organizer, 'tu nombre', 80), email: email(input.email), date: text(input.date, 'la fecha', 40, true), budget: text(input.budget, 'el presupuesto', 100, true), place: text(input.place, 'el lugar', 160, true), occasion: input.occasion };
  if (!['navidad', 'familia', 'amigos', 'trabajo', 'otro'].includes(d.occasion)) throw new UserError('Elegí una ocasión.');
  if (!Array.isArray(input.participants) || input.participants.length < 3 || input.participants.length > 30) throw new UserError('Agregá entre 3 y 30 participantes.');
  d.participants = input.participants.map((p, i) => ({ id: String(i), name: text(p.name, 'el nombre del participante', 80), email: email(p.email) }));
  if (new Set(d.participants.map(p => p.email)).size !== d.participants.length) throw new UserError('Cada participante necesita un correo diferente.');
  if (!Array.isArray(input.exclusions) || input.exclusions.length > 450) throw new UserError('Revisá las restricciones.');
  d.exclusions = input.exclusions.map(pair => {
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some(n => !Number.isInteger(n) || n < 0 || n >= d.participants.length) || pair[0] === pair[1]) throw new UserError('Revisá las restricciones.');
    return pair;
  });
  assign(d.participants.length, d.exclusions);
  return d;
}
// Randomized bipartite matching: every valid recipient appears exactly once.
export function assign(n, exclusions = []) {
  const shuffled = a => { for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const allowed = Array.from({ length: n }, (_, giver) => shuffled(Array.from({ length: n }, (_, i) => i).filter(receiver => receiver !== giver && !exclusions.some(([a, b]) => (a === giver && b === receiver) || (b === giver && a === receiver)))));
  const owner = Array(n).fill(-1);
  function match(giver, seen) { for (const receiver of allowed[giver]) { if (seen.has(receiver)) continue; seen.add(receiver); if (owner[receiver] === -1 || match(owner[receiver], seen)) { owner[receiver] = giver; return true; } } return false; }
  for (const giver of shuffled(Array.from({ length: n }, (_, i) => i))) if (!match(giver, new Set())) throw new UserError('Estas restricciones no permiten un sorteo. Quitá alguna o agregá participantes.');
  const result = Array(n); owner.forEach((giver, receiver) => { result[giver] = receiver; }); return result;
}
export function sign(code, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ code, exp: now + 7 * 86400000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
export function verify(token, code, secret, now = Date.now()) {
  try { const [p, mac, extra] = token.split('.'); const expected = createHmac('sha256', secret).update(p).digest(); const received = Buffer.from(mac, 'base64url'); const value = JSON.parse(Buffer.from(p, 'base64url').toString()); return !extra && received.length === expected.length && timingSafeEqual(received, expected) && value.code === code && value.exp > now; } catch { return false; }
}
export function publicDraw(d) { const { assignments, email: organizerEmail, pending, ...safe } = d; return { ...safe, busy: Boolean(pending), pendingId: pending?.id, pendingStartedAt: pending?.startedAt }; }
