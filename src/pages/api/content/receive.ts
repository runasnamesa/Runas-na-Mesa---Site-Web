export const prerender = false;

import type { APIRoute } from 'astro';
import { isAuthenticatedCookie, safeEqual, writeStoredContent } from '../../../lib/admin';

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Integração externa: exige `Authorization: Bearer <CONTENT_API_TOKEN>`
 * (variável de ambiente; sem ela, só a sessão do painel serve). Antes esta
 * rota aceitava qualquer um e o HTML gravado aparecia em /texto-mestre.
 */
function isAuthorized(request: Request, cookies: Parameters<typeof isAuthenticatedCookie>[0]) {
  if (isAuthenticatedCookie(cookies)) return true;
  const expected = process.env.CONTENT_API_TOKEN ?? import.meta.env.CONTENT_API_TOKEN;
  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(expected && expected.length >= 32 && provided && safeEqual(provided, expected));
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthorized(request, cookies)) {
    return json({ ok: false, message: 'Não autorizado.' }, 401);
  }

  const raw = await request.json().catch(() => null);

  const content = typeof raw?.content === 'string'
    ? raw.content
    : typeof raw?.text === 'string'
      ? raw.text
      : '';

  if (!content.trim()) {
    return json({ ok: false, message: 'Conteúdo vazio.' }, 400);
  }
  if (content.length > 200_000) {
    return json({ ok: false, message: 'Conteúdo grande demais.' }, 413);
  }

  await writeStoredContent(content);

  return json({ ok: true, message: 'Conteúdo recebido com sucesso.' }, 200);
};
