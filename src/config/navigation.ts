/**
 * Primary site navigation — shared by Navbar and Footer.
 */
import { SITE } from './site';

export interface NavLink {
  label: string;
  href: string;
}

export const MAIN_NAV: NavLink[] = [
  { label: 'Início', href: '/index' },
  { label: 'Guias', href: '/guias' },
  { label: 'Lore', href: '/lore' },
  // A Taverna é a mesa virtual do grupo (mesa.runasnamesa.com.br).
  { label: 'Taverna', href: SITE.mesaUrl },
  { label: 'Sobre', href: '/sobre' },
];

export const COMMUNITY_NAV: NavLink[] = [
  { label: 'Substack', href: '/comunidade' },
  { label: 'Instagram', href: '/comunidade' },
  { label: 'Discord', href: '/comunidade' },
];
