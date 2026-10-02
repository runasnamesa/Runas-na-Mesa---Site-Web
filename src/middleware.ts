import { defineMiddleware } from 'astro:middleware';

/**
 * Cabeçalhos de segurança em todas as respostas renderizadas pelo servidor.
 * A CSP libera só o que o site usa: Google Fonts e imagens do Unsplash e do
 * Substack (posts importados de lá) — imagem nova de outro host precisa entrar
 * em img-src;
 * scripts e estilos inline continuam permitidos (Astro e as cenas usam).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://substackcdn.com https://substack-post-media.s3.amazonaws.com",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }

  // Painel e API do Mestre: nunca em cache nem em buscador.
  const path = context.url.pathname;
  if (path.startsWith('/admin') || path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
