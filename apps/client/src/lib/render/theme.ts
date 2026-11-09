export type ThemeId = 'minimal' | 'noturno' | 'contraste';

export interface CanvasTheme {
  table: string;
  tableEdge: string;
  tableLine: string;
  tableText: string;
  tableTextMuted: string;
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

const mesaCanvas: CanvasTheme = {
  table: '#1f7a5a',
  tableEdge: '#14563f',
  tableLine: 'rgba(255, 248, 230, 0.13)',
  tableText: '#fff8e6',
  tableTextMuted: 'rgba(255, 248, 230, 0.7)',
  text: '#2b1a12',
  textMuted: '#7a5a45',
  panel: '#fff8e6',
  panelBorder: '#2b1a12',
  accent: '#e4572e',
  gold: '#f2a900',
  danger: '#b42318',
  success: '#2f8a4a',
  cardPaper: '#fffaf0',
  cardInk: '#241a12',
  cardRed: '#c92a2a',
  cardBorder: '#2b1a12',
  cardShadow: 'rgba(43, 26, 18, 0.28)',
  back: '#e4572e',
  backInk: '#fff3dc',
  backAccent: '#f2a900',
};

const noturnoCanvas: CanvasTheme = {
  table: '#21313a',
  tableEdge: '#152128',
  tableLine: 'rgba(247, 241, 227, 0.1)',
  tableText: '#f7f1e3',
  tableTextMuted: 'rgba(247, 241, 227, 0.62)',
  text: '#f7f1e3',
  textMuted: '#a8b0c8',
  panel: '#252b44',
  panelBorder: '#0b0d18',
  accent: '#ffb703',
  gold: '#ffd166',
  danger: '#ff6b6b',
  success: '#7bd389',
  cardPaper: '#f8f0df',
  cardInk: '#1c1c24',
  cardRed: '#c92a2a',
  cardBorder: '#0b0d18',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
  back: '#3d5a80',
  backInk: '#e0fbfc',
  backAccent: '#ffb703',
};

const contrasteCanvas: CanvasTheme = {
  table: '#d9d9d9',
  tableEdge: '#000000',
  tableLine: 'rgba(0, 0, 0, 0.45)',
  tableText: '#000000',
  tableTextMuted: '#333333',
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
  backAccent: '#ffd400',
};

export const THEMES: Theme[] = [
  {
    id: 'minimal',
    name: 'Mesa',
    canvas: mesaCanvas,
    css: {
      '--bg': '#f6d7a5',
      '--bg-2': '#efc07b',
      '--panel': '#fff8e6',
      '--panel-2': '#ffeecb',
      '--text': '#2b1a12',
      '--muted': '#7a5a45',
      '--border': '#2b1a12',
      '--accent': '#e4572e',
      '--accent-2': '#c94320',
      '--danger': '#b42318',
      '--success': '#2f8a4a',
      '--gold': '#f2a900',
      '--shadow': '6px 6px 0 #2b1a12',
      '--table': '#1f7a5a',
    },
  },
  {
    id: 'noturno',
    name: 'Noturno',
    canvas: noturnoCanvas,
    css: {
      '--bg': '#171a2b',
      '--bg-2': '#101224',
      '--panel': '#252b44',
      '--panel-2': '#303a5c',
      '--text': '#f7f1e3',
      '--muted': '#a8b0c8',
      '--border': '#0b0d18',
      '--accent': '#ffb703',
      '--accent-2': '#ff9e00',
      '--danger': '#ff6b6b',
      '--success': '#7bd389',
      '--gold': '#ffd166',
      '--shadow': '6px 6px 0 #000000',
      '--table': '#21313a',
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
      '--panel-2': '#f2f2f2',
      '--text': '#000000',
      '--muted': '#333333',
      '--border': '#000000',
      '--accent': '#005fcc',
      '--accent-2': '#004799',
      '--danger': '#b00020',
      '--success': '#006400',
      '--gold': '#7a4b00',
      '--shadow': '6px 6px 0 #000000',
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
  meta?.setAttribute('content', theme.css['--bg'] ?? '#f6d7a5');
}
