import type { Card, Suit } from '@manilha/protocol';
import type { CanvasTheme } from './theme';

const DISPLAY =
  '"Fredoka Variable", ui-rounded, "Trebuchet MS", ui-sans-serif, system-ui, sans-serif';

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
  ctx.font = `600 ${size}px ${DISPLAY}`;
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

function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  width: number,
  height: number,
  theme: CanvasTheme,
  queen: boolean,
): void {
  const left = cx - width / 2;
  const right = cx + width / 2;
  const path = new Path2D();

  if (queen) {
    path.moveTo(left, baseY);
    path.lineTo(left, baseY - height * 0.42);
    path.lineTo(cx - width * 0.28, baseY - height * 0.13);
    path.lineTo(cx - width * 0.14, baseY - height * 0.78);
    path.lineTo(cx, baseY - height * 0.3);
    path.lineTo(cx + width * 0.14, baseY - height * 0.78);
    path.lineTo(cx + width * 0.28, baseY - height * 0.13);
    path.lineTo(right, baseY - height * 0.42);
  } else {
    path.moveTo(left, baseY);
    path.lineTo(left, baseY - height * 0.5);
    path.lineTo(left + width * 0.18, baseY - height * 0.18);
    path.lineTo(left + width * 0.3, baseY - height * 0.85);
    path.lineTo(cx, baseY - height * 0.35);
    path.lineTo(right - width * 0.3, baseY - height * 0.85);
    path.lineTo(right - width * 0.18, baseY - height * 0.18);
    path.lineTo(right, baseY - height * 0.5);
  }
  path.lineTo(right, baseY);
  path.closePath();

  ctx.save();
  ctx.fillStyle = theme.gold;
  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = Math.max(1, height * 0.018);
  ctx.fill(path);
  ctx.stroke(path);

  const bandY = baseY - height * 0.2;
  roundRect(ctx, left, bandY, width, height * 0.2, height * 0.025);
  ctx.fillStyle = theme.gold;
  ctx.fill();
  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = Math.max(1, height * 0.014);
  ctx.stroke();

  const pearls: Array<[number, number]> = queen
    ? [
        [left, baseY - height * 0.42],
        [cx, baseY - height * 0.3],
        [right, baseY - height * 0.42],
      ]
    : [
        [left, baseY - height * 0.5],
        [left + width * 0.3, baseY - height * 0.85],
        [cx, baseY - height * 0.35],
        [right - width * 0.3, baseY - height * 0.85],
        [right, baseY - height * 0.5],
      ];

  for (const [x, y] of pearls) {
    ctx.beginPath();
    ctx.arc(x, y, height * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = theme.cardPaper;
    ctx.fill();
    ctx.strokeStyle = theme.cardInk;
    ctx.lineWidth = Math.max(1, height * 0.01);
    ctx.stroke();
  }

  ctx.fillStyle = theme.cardPaper;
  for (let index = -1; index <= 1; index += 1) {
    ctx.beginPath();
    ctx.arc(cx + index * width * 0.18, bandY + height * 0.09, height * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSword(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  height: number,
  theme: CanvasTheme,
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const bladeWidth = height * 0.065;
  const outline = Math.max(1, height * 0.012);

  ctx.save();
  ctx.translate(fromX, fromY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, -length);
  ctx.lineTo(bladeWidth * 0.5, -length * 0.86);
  ctx.lineTo(bladeWidth * 0.5, -height * 0.035);
  ctx.lineTo(-bladeWidth * 0.5, -height * 0.035);
  ctx.lineTo(-bladeWidth * 0.5, -length * 0.86);
  ctx.closePath();
  ctx.fillStyle = theme.cardPaper;
  ctx.fill();
  ctx.fillStyle = theme.cardInk;
  ctx.globalAlpha = 0.14;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = outline;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -length * 0.88);
  ctx.lineTo(0, -height * 0.05);
  ctx.strokeStyle = theme.cardInk;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, height * 0.008);
  ctx.stroke();
  ctx.globalAlpha = 1;

  roundRect(
    ctx,
    -bladeWidth * 1.8,
    -height * 0.048,
    bladeWidth * 3.6,
    height * 0.034,
    height * 0.012,
  );
  ctx.fillStyle = theme.gold;
  ctx.fill();
  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = outline;
  ctx.stroke();

  roundRect(ctx, -bladeWidth * 0.45, height * 0.0, bladeWidth * 0.9, height * 0.11, height * 0.018);
  ctx.fillStyle = theme.cardInk;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, height * 0.125, bladeWidth * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = theme.gold;
  ctx.fill();
  ctx.strokeStyle = theme.cardInk;
  ctx.lineWidth = outline;
  ctx.stroke();

  ctx.restore();
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  card: Card,
  cx: number,
  cy: number,
  width: number,
  height: number,
  theme: CanvasTheme,
): void {
  const left = cx - width / 2;
  const right = cx + width / 2;
  const top = cy - height / 2;
  const bottom = cy + height / 2;
  const path = new Path2D();
  path.moveTo(left, top);
  path.lineTo(right, top);
  path.lineTo(right, top + height * 0.35);
  path.quadraticCurveTo(right, bottom - height * 0.16, cx, bottom);
  path.quadraticCurveTo(left, bottom - height * 0.16, left, top + height * 0.35);
  path.closePath();

  ctx.save();
  ctx.fillStyle = suitColor(card.suit, theme);
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = Math.max(1.5, height * 0.026);
  ctx.fill(path);
  ctx.stroke(path);

  ctx.strokeStyle = theme.cardPaper;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1, height * 0.012);
  ctx.stroke(path);
  ctx.globalAlpha = 1;

  drawSuit(ctx, card.suit, cx, cy - height * 0.02, height * 0.2, theme.cardPaper);
  ctx.restore();
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

  if (card.rank === 'K') {
    drawSword(ctx, width * 0.28, height * 0.68, width * 0.78, height * 0.22, height, theme);
    drawCrown(ctx, width * 0.44, height * 0.6, width * 0.32, height * 0.3, theme, false);
  } else if (card.rank === 'Q') {
    drawCrown(ctx, centerX, height * 0.64, width * 0.4, height * 0.36, theme, true);
  } else {
    drawSword(ctx, width * 0.74, height * 0.66, width * 0.24, height * 0.22, height, theme);
    drawShield(ctx, card, width * 0.47, height * 0.49, width * 0.3, height * 0.32, theme);
  }
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
  ctx.lineWidth = Math.max(1.5, height * 0.008);
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
  ctx.font = `600 ${medalR * 0.62}px ${DISPLAY}`;
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
