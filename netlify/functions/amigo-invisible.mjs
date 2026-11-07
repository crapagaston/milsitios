import { getStore } from '@netlify/blobs';
import { makeService } from '../lib/amigo-service.mjs';
import { UserError } from '../lib/amigo-core.mjs';
export default async function handler(request, context) {
  const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Origen no permitido.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Formato no permitido.' }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 40000) return reply({ error: 'El formulario es demasiado largo.' }, 413);
    let body; try { body = JSON.parse(raw); } catch { return reply({ error: 'Formulario inválido.' }, 400); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return reply({ error: 'Formulario inválido.' }, 400);
    const service = makeService({ store: getStore({ name: 'amigo-invisible-v1', consistency: 'strong' }), env: process.env });
    return reply(await service.run(body, { token: request.headers.get('authorization')?.replace(/^Bearer /, '') || '', ip: context.ip }));
  } catch (error) {
    return reply({ error: error instanceof UserError ? error.message : 'No pudimos completar la operación. Actualizá el panel antes de reintentar.' }, error instanceof UserError ? error.status : 500);
  }
}
