/**
 * Site-wide constants for Runas na Mesa.
 * Single source of truth for URL, SEO defaults, and brand copy.
 */
export const SITE = {
  name: 'Runas na Mesa',
  url: 'https://runasnamesa.com.br',
  /** A mesa virtual do grupo (outro projeto, mesmo domínio). */
  mesaUrl: 'https://mesa.runasnamesa.com.br',
  tagline: 'Sua taverna para histórias épicas.',
  description:
    'Um refúgio acolhedor para jogadores e mestres de RPG. Descanse, aprenda e prepare-se para a próxima aventura.',
  /** Fallback when a page does not provide og:image */
  defaultOgImage: '/favicon.svg',
  locale: 'pt_BR',
  lang: 'pt-BR',
} as const;
