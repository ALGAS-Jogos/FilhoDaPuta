import type { Card, Suit } from '@manilha/protocol';
import type { CanvasTheme } from './theme';

export const CARD_RATIO = 500 / 726;

const SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';

const SUIT_COLOR: Record<Suit, 'ink' | 'red'> = {
  clubs: 'ink',
  spades: 'ink',
  diamonds: 'red',
  hearts: 'red',
};

const SUIT_PATH: Record<Suit, Path2D> = {
  hearts: makeHeart(),
  diamonds: makeDiamond(),
  spades: makeSpade(),
  clubs: makeClub(),
};

const PIPS: Record<string, Array<[number, number]>> = {
  '2': [
    [0.5, 0.22],
    [0.5, 0.78],
  ],
  '3': [
    [0.5, 0.2],
    [0.5, 0.5],
    [0.5, 0.8],
  ],
  '4': [
    [0.3, 0.22],
    [0.7, 0.22],
    [0.3, 0.78],
    [0.7, 0.78],
  ],
  '5': [
    [0.3, 0.22],
    [0.7, 0.22],
    [0.5, 0.5],
    [0.3, 0.78],
    [0.7, 0.78],
  ],
  '6': [
    [0.3, 0.2],
    [0.7, 0.2],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.3, 0.8],
    [0.7, 0.8],
  ],
  '7': [
    [0.3, 0.18],
    [0.7, 0.18],
    [0.5, 0.34],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.3, 0.82],
    [0.7, 0.82],
  ],
  '8': [
    [0.3, 0.18],
    [0.7, 0.18],
    [0.5, 0.34],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.5, 0.66],
    [0.3, 0.82],
    [0.7, 0.82],
  ],
  '9': [
    [0.3, 0.16],
    [0.7, 0.16],
    [0.3, 0.39],
    [0.7, 0.39],
    [0.5, 0.5],
    [0.3, 0.61],
    [0.7, 0.61],
    [0.3, 0.84],
    [0.7, 0.84],
  ],
  '10': [
    [0.3, 0.15],
    [0.7, 0.15],
    [0.3, 0.35],
    [0.7, 0.35],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.3, 0.65],
    [0.7, 0.65],
    [0.3, 0.85],
    [0.7, 0.85],
  ],
};

function makeHeart(): Path2D {
  const path = new Path2D();
  path.moveTo(0, 0.42);
  path.bezierCurveTo(-0.55, 0.05, -0.5, -0.35, -0.22, -0.35);
  path.bezierCurveTo(-0.08, -0.35, 0, -0.22, 0, -0.12);
  path.bezierCurveTo(0, -0.22, 0.08, -0.35, 0.22, -0.35);
  path.bezierCurveTo(0.5, -0.35, 0.55, 0.05, 0, 0.42);
  path.closePath();
  return path;
}

function makeDiamond(): Path2D {
  const path = new Path2D();
  path.moveTo(0, -0.5);
  path.lineTo(0.38, 0);
  path.lineTo(0, 0.5);
  path.lineTo(-0.38, 0);
  path.closePath();
  return path;
}

function makeSpade(): Path2D {
  const path = new Path2D();
  path.moveTo(0, -0.5);
  path.bezierCurveTo(0.18, -0.25, 0.5, -0.12, 0.5, 0.12);
  path.bezierCurveTo(0.5, 0.33, 0.32, 0.42, 0.16, 0.34);
  path.bezierCurveTo(0.08, 0.3, 0.04, 0.22, 0, 0.18);
  path.bezierCurveTo(0, 0.3, 0.08, 0.44, 0.12, 0.5);
  path.lineTo(-0.12, 0.5);
  path.bezierCurveTo(-0.08, 0.44, 0, 0.3, 0, 0.18);
  path.bezierCurveTo(-0.04, 0.22, -0.08, 0.3, -0.16, 0.34);
  path.bezierCurveTo(-0.32, 0.42, -0.5, 0.33, -0.5, 0.12);
  path.bezierCurveTo(-0.5, -0.12, -0.18, -0.25, 0, -0.5);
  path.closePath();
  return path;
}

function makeClub(): Path2D {
  const path = new Path2D();
  path.moveTo(0.17, -0.24);
  path.arc(0, -0.24, 0.17, 0, Math.PI * 2);
  path.moveTo(-0.02, 0.02);
  path.arc(-0.2, 0.02, 0.18, 0, Math.PI * 2);
  path.moveTo(0.38, 0.02);
  path.arc(0.2, 0.02, 0.18, 0, Math.PI * 2);
  path.moveTo(0, 0.18);
  path.lineTo(-0.09, 0.48);
  path.lineTo(0.09, 0.48);
  path.closePath();
  return path;
}

function makeStar(): Path2D {
  const path = new Path2D();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 0.5 : 0.22;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.closePath();
  return path;
}

const STAR = makeStar();

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawSuit(
  ctx: CanvasRenderingContext2D,
  suit: Suit,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const path = SUIT_PATH[suit];
  if (path) {
    ctx.fillStyle = color;
    ctx.fill(path);
  }
  ctx.restore();
}

function suitColor(suit: Suit, theme: CanvasTheme): string {
  return SUIT_COLOR[suit] === 'red' ? theme.cardRed : theme.cardInk;
}

function drawCorner(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
  theme: CanvasTheme,
  bottom: boolean,
): void {
  const size = height * 0.105;
  ctx.save();
  if (bottom) {
    ctx.translate(width * 0.925, height * 0.95);
    ctx.rotate(Math.PI);
  } else {
    ctx.translate(width * 0.075, height * 0.05);
  }
  ctx.fillStyle = suitColor(card.suit, theme);
  ctx.font = `700 ${size}px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, 0, 0);
  drawSuit(ctx, card.suit, size * 0.5, size * 1.5, size * 0.62, suitColor(card.suit, theme));
  ctx.restore();
}

function drawPips(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  const layout = PIPS[card.rank];
  if (!layout) {
    return;
  }
  const pipSize = height * (layout.length >= 10 ? 0.058 : 0.068);
  const color = suitColor(card.suit, theme);
  for (const [x, y] of layout) {
    drawSuit(ctx, card.suit, width * x, height * y, pipSize, color);
  }
}

function drawAce(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  drawSuit(ctx, card.suit, width * 0.5, height * 0.5, height * 0.34, suitColor(card.suit, theme));
}

function drawCourt(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  const panelX = width * 0.16;
  const panelY = height * 0.18;
  const panelW = width * 0.68;
  const panelH = height * 0.64;

  roundRect(ctx, panelX, panelY, panelW, panelH, height * 0.025);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = Math.max(1, height * 0.004);
  ctx.stroke();

  const centerX = width * 0.5;
  const headY = height * 0.37;
  const headR = height * 0.07;
  const isRed = suitColor(card.suit, theme) === theme.cardRed;
  const cloth = isRed ? theme.cardRed : theme.accent;

  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(width * 0.26, height * 0.77);
  ctx.quadraticCurveTo(centerX, height * 0.52, width * 0.74, height * 0.77);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme.cardPaper;
  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = Math.max(1, height * 0.004);
  ctx.beginPath();
  ctx.arc(centerX, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.cardInk;
  ctx.beginPath();
  ctx.arc(centerX - headR * 0.28, headY - headR * 0.1, headR * 0.09, 0, Math.PI * 2);
  ctx.arc(centerX + headR * 0.28, headY - headR * 0.1, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = Math.max(1, height * 0.006);
  ctx.beginPath();
  ctx.arc(centerX, headY + headR * 0.2, headR * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  if (card.rank === 'K') {
    ctx.fillStyle = theme.gold;
    ctx.beginPath();
    ctx.moveTo(centerX - headR * 0.9, headY - headR * 0.95);
    ctx.lineTo(centerX - headR * 0.55, headY - headR * 1.55);
    ctx.lineTo(centerX - headR * 0.15, headY - headR * 1.1);
    ctx.lineTo(centerX + headR * 0.2, headY - headR * 1.7);
    ctx.lineTo(centerX + headR * 0.55, headY - headR * 1.1);
    ctx.lineTo(centerX + headR * 0.9, headY - headR * 1.55);
    ctx.lineTo(centerX + headR * 0.75, headY - headR * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (card.rank === 'Q') {
    ctx.fillStyle = theme.gold;
    ctx.beginPath();
    ctx.arc(centerX, headY - headR * 1.05, headR * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX - headR * 0.85, headY - headR * 0.8);
    ctx.quadraticCurveTo(
      centerX,
      headY - headR * 1.35,
      centerX + headR * 0.85,
      headY - headR * 0.8,
    );
    ctx.quadraticCurveTo(centerX, headY - headR * 0.6, centerX - headR * 0.85, headY - headR * 0.8);
    ctx.fill();
  } else {
    ctx.fillStyle = theme.gold;
    ctx.beginPath();
    ctx.moveTo(centerX + headR * 0.45, headY - headR * 0.85);
    ctx.quadraticCurveTo(
      centerX + headR * 1.4,
      headY - headR * 1.7,
      centerX + headR * 1.15,
      headY - headR * 0.45,
    );
    ctx.quadraticCurveTo(
      centerX + headR * 0.9,
      headY - headR * 0.4,
      centerX + headR * 0.45,
      headY - headR * 0.85,
    );
    ctx.fill();
  }

  ctx.font = `700 ${height * 0.09}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.cardInk;
  ctx.fillText(card.rank, centerX, height * 0.72);
  drawSuit(ctx, card.suit, centerX, height * 0.785, height * 0.055, suitColor(card.suit, theme));
}

function drawManilhaBadge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  const radius = height * 0.045;
  const x = width * 0.86;
  const y = height * 0.085;
  ctx.save();
  ctx.fillStyle = theme.gold;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y);
  ctx.scale(radius * 1.25, radius * 1.25);
  ctx.fillStyle = theme.cardPaper;
  ctx.fill(STAR);
  ctx.restore();
}

export function drawCardFace(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  roundRect(ctx, 0, 0, width, height, height * 0.055);
  ctx.fillStyle = theme.cardPaper;
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = Math.max(1, height * 0.006);
  ctx.stroke();

  roundRect(
    ctx,
    height * 0.018,
    height * 0.018,
    width - height * 0.036,
    height - height * 0.036,
    height * 0.04,
  );
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
  ctx.lineWidth = Math.max(1, height * 0.003);
  ctx.stroke();

  drawCorner(ctx, card, width, height, theme, false);
  drawCorner(ctx, card, width, height, theme, true);

  if (card.rank === 'A') {
    drawAce(ctx, card, width, height, theme);
  } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
    drawCourt(ctx, card, width, height, theme);
  } else {
    drawPips(ctx, card, width, height, theme);
  }

  if (card.isManilha) {
    drawManilhaBadge(ctx, width, height, theme);
  }
}

export function drawCardBack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  const radius = height * 0.055;
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.fillStyle = theme.back;
  ctx.fill();
  ctx.strokeStyle = theme.backAccent;
  ctx.lineWidth = Math.max(1, height * 0.007);
  ctx.stroke();

  const inset = height * 0.035;
  roundRect(ctx, inset, inset, width - inset * 2, height - inset * 2, radius * 0.7);
  ctx.strokeStyle = theme.backAccent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, height * 0.003);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.save();
  roundRect(
    ctx,
    inset * 1.7,
    inset * 1.7,
    width - inset * 3.4,
    height - inset * 3.4,
    radius * 0.55,
  );
  ctx.clip();
  ctx.strokeStyle = theme.backInk;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = Math.max(1, height * 0.004);
  const step = height * 0.075;
  for (let offset = -height; offset < width + height; offset += step) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + height, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset + height, 0);
    ctx.lineTo(offset, height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = theme.backInk;
  ctx.globalAlpha = 0.22;
  const ringStep = height * 0.11;
  for (let ring = ringStep; ring < height * 0.8; ring += ringStep) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const medalR = Math.min(width, height) * 0.15;
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.fillStyle = theme.backAccent;
  ctx.beginPath();
  ctx.arc(0, 0, medalR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.back;
  ctx.beginPath();
  ctx.arc(0, 0, medalR * 0.82, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.backInk;
  ctx.font = `700 ${medalR * 0.62}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', 0, medalR * 0.04);
  ctx.restore();
}

export interface CachedCard {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export class CardArtCache {
  private readonly cache = new Map<string, CachedCard>();

  getFace(card: Card, width: number, height: number, theme: CanvasTheme, dpr: number): CachedCard {
    const key = `f:${theme.cardPaper}:${theme.back}:${card.id}:${width}:${height}:${dpr}`;
    return this.getOrCreate(key, width, height, dpr, (ctx) =>
      drawCardFace(ctx, card, width, height, theme),
    );
  }

  getBack(width: number, height: number, theme: CanvasTheme, dpr: number): CachedCard {
    const key = `b:${theme.back}:${theme.backInk}:${theme.backAccent}:${width}:${height}:${dpr}`;
    return this.getOrCreate(key, width, height, dpr, (ctx) =>
      drawCardBack(ctx, width, height, theme),
    );
  }

  clear(): void {
    this.cache.clear();
  }

  private getOrCreate(
    key: string,
    width: number,
    height: number,
    dpr: number,
    paint: (ctx: CanvasRenderingContext2D) => void,
  ): CachedCard {
    const existing = this.cache.get(key);
    if (existing) {
      return existing;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      paint(ctx);
    }
    const cached = { canvas, width, height };
    this.cache.set(key, cached);
    return cached;
  }
}

export function drawCardBitmap(
  ctx: CanvasRenderingContext2D,
  cached: CachedCard,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rotation !== 0) {
    ctx.rotate(rotation);
  }
  ctx.drawImage(cached.canvas, -width / 2, -height / 2, width, height);
  ctx.restore();
}
