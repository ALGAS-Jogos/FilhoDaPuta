export type ThemeId = 'minimal' | 'noturno' | 'contraste';

export interface CanvasTheme {
  table: string;
  tableEdge: string;
  tableLine: string;
  text: string;
  textMuted: string;
  panel: string;
  panelBorder: string;
  accent: string;
  gold: string;
  danger: string;
  success: string;
  cardPaper: string;
  cardInk: string;
  cardRed: string;
  cardBorder: string;
  cardShadow: string;
  back: string;
  backInk: string;
  backAccent: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  canvas: CanvasTheme;
  css: Record<string, string>;
}

const minimalCanvas: CanvasTheme = {
  table: '#ded5c2',
  tableEdge: '#cfc4ad',
  tableLine: 'rgba(31, 36, 32, 0.12)',
  text: '#1f2420',
  textMuted: '#6d7169',
  panel: '#fffdf8',
  panelBorder: '#d5cdbd',
  accent: '#1f6f5c',
  gold: '#b0842a',
  danger: '#b3261e',
  success: '#3a7d44',
  cardPaper: '#fffdf6',
  cardInk: '#20231f',
  cardRed: '#b3261e',
  cardBorder: '#cfc6b4',
  cardShadow: 'rgba(0, 0, 0, 0.18)',
  back: '#1f6f5c',
  backInk: '#f8f3e8',
  backAccent: '#b0842a',
};

const noturnoCanvas: CanvasTheme = {
  table: '#16211f',
  tableEdge: '#0e1715',
  tableLine: 'rgba(255, 255, 255, 0.08)',
  text: '#e9e6dd',
  textMuted: '#9aa3a0',
  panel: '#1b2229',
  panelBorder: '#33404a',
  accent: '#4ecdc4',
  gold: '#e0b45c',
  danger: '#ff7a70',
  success: '#86d98a',
  cardPaper: '#f3eee2',
  cardInk: '#20231f',
  cardRed: '#b3261e',
  cardBorder: '#b8ae9b',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  back: '#24403c',
  backInk: '#d9f2ec',
  backAccent: '#4ecdc4',
};

const contrasteCanvas: CanvasTheme = {
  table: '#d9d9d9',
  tableEdge: '#000000',
  tableLine: '#000000',
  text: '#000000',
  textMuted: '#333333',
  panel: '#ffffff',
  panelBorder: '#000000',
  accent: '#005fcc',
  gold: '#7a4b00',
  danger: '#b00020',
  success: '#006400',
  cardPaper: '#ffffff',
  cardInk: '#000000',
  cardRed: '#b00020',
  cardBorder: '#000000',
  cardShadow: 'rgba(0, 0, 0, 0.35)',
  back: '#000000',
  backInk: '#ffffff',
  backAccent: '#ffffff',
};

export const THEMES: Theme[] = [
  {
    id: 'minimal',
    name: 'Clássico claro',
    canvas: minimalCanvas,
    css: {
      '--bg': '#f2eee4',
      '--bg-2': '#e9e3d5',
      '--panel': '#fffdf8',
      '--panel-2': '#f7f2e8',
      '--text': '#1f2420',
      '--muted': '#6d7169',
      '--border': '#d5cdbd',
      '--accent': '#1f6f5c',
      '--accent-2': '#2a8c74',
      '--danger': '#b3261e',
      '--success': '#3a7d44',
      '--gold': '#b0842a',
      '--shadow': '0 18px 50px rgba(31, 36, 32, 0.16)',
      '--table': '#ded5c2',
    },
  },
  {
    id: 'noturno',
    name: 'Noturno',
    canvas: noturnoCanvas,
    css: {
      '--bg': '#101418',
      '--bg-2': '#171d22',
      '--panel': '#1b2229',
      '--panel-2': '#222b33',
      '--text': '#e9e6dd',
      '--muted': '#9aa3a0',
      '--border': '#33404a',
      '--accent': '#4ecdc4',
      '--accent-2': '#6ee7de',
      '--danger': '#ff7a70',
      '--success': '#86d98a',
      '--gold': '#e0b45c',
      '--shadow': '0 18px 50px rgba(0, 0, 0, 0.45)',
      '--table': '#16211f',
    },
  },
  {
    id: 'contraste',
    name: 'Alto contraste',
    canvas: contrasteCanvas,
    css: {
      '--bg': '#ffffff',
      '--bg-2': '#f0f0f0',
      '--panel': '#ffffff',
      '--panel-2': '#f7f7f7',
      '--text': '#000000',
      '--muted': '#333333',
      '--border': '#000000',
      '--accent': '#005fcc',
      '--accent-2': '#004799',
      '--danger': '#b00020',
      '--success': '#006400',
      '--gold': '#7a4b00',
      '--shadow': '0 18px 50px rgba(0, 0, 0, 0.25)',
      '--table': '#d9d9d9',
    },
  },
];

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((theme) => theme.id === id) ?? (THEMES[0] as Theme);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  for (const [property, value] of Object.entries(theme.css)) {
    root.style.setProperty(property, value);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme.css['--bg'] ?? '#f2eee4');
}
