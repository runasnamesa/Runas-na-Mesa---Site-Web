export const prerender = false;

import type { APIRoute } from 'astro';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
  verifyMasterLogin,
} from '../../../lib/admin';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const username = String(formData.get('username') ?? '').slice(0, 100);
  const password = String(formData.get('password') ?? '').slice(0, 200);

  const token = verifyMasterLogin(username, password) ? createSessionToken() : null;
  if (!token) {
    // Atraso fixo: encarece tentativas de adivinhar a senha.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return redirect('/admin?status=invalid');
  }

  cookies.set(ADMIN_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: import.meta.env.PROD,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return redirect('/admin');
};
