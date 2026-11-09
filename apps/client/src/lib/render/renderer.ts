import type { Card, StateMessage } from '@manilha/protocol';
import { CardArtCache, drawCardBitmap } from './cards';
import {
  type CardSlot,
  computeLayout,
  hitTestCard,
  type PlayedSlot,
  type SeatSlot,
  type TableLayout,
} from './layout';
import { getTheme, type Theme, type ThemeId } from './theme';

const clamp = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value));

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

const SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

interface PlayAnimation {
  start: number;
  seat: number;
}

interface TrickGhost {
  slot: PlayedSlot;
  card: Card;
}

export class TableRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cache = new CardArtCache();
  private readonly reducedMotion: boolean;
  private theme: Theme = getTheme('minimal');
  private state: StateMessage | null = null;
  private layout: TableLayout | null = null;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private running = false;
  private frameHandle = 0;
  private resizeObserver: ResizeObserver | null = null;
  private selectedCardId: string | null = null;
  private hoverCardId: string | null = null;
  private playAnimations = new Map<string, PlayAnimation>();
  private dealAt = 0;
  private trickClearAt = 0;
  private trickGhosts: TrickGhost[] = [];
  private trickWinnerSeat: number | null = null;
  private lifeFlashAt = 0;
  private lastLives = new Map<number, number>();

  onCardClick: ((cardId: string) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D não disponível');
    }
    this.ctx = context;
    this.reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  mount(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.canvas);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.resize();
    this.running = true;
    this.frameHandle = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
  }

  setTheme(themeId: ThemeId): void {
    this.theme = getTheme(themeId);
    this.cache.clear();
    this.rebuildLayout();
  }

  setSelected(cardId: string | null): void {
    this.selectedCardId = cardId;
    this.updateCursor();
  }

  setState(next: StateMessage): void {
    if (this.state && next.seq <= this.state.seq) {
      return;
    }
    const now = performance.now();
    const previous = this.state;
    const previousLayout = this.layout;

    if (previous) {
      const previousPhase = previous.game?.phase;
      const nextPhase = next.game?.phase;
      const previousRound = previous.game?.round;
      const nextRound = next.game?.round;

      if (
        next.game &&
        (previousRound !== nextRound || (previousPhase !== 'betting' && nextPhase === 'betting'))
      ) {
        this.dealAt = now;
        this.playAnimations.clear();
        this.trickClearAt = 0;
        this.trickGhosts = [];
      }

      const previousCards = new Set((previous.game?.table ?? []).map((played) => played.card.id));
      for (const played of next.game?.table ?? []) {
        if (!previousCards.has(played.card.id)) {
          this.playAnimations.set(played.card.id, { start: now, seat: played.seat });
        }
      }

      if ((previous.game?.table.length ?? 0) > 0 && (next.game?.table.length ?? 0) === 0) {
        this.trickClearAt = now;
        this.trickGhosts = (previousLayout?.table ?? []).map((slot) => ({
          slot,
          card: slot.card,
        }));
        this.trickWinnerSeat = previous.game?.lastTrick?.winnerSeat ?? null;
      }

      for (const player of next.players) {
        const previousLives = this.lastLives.get(player.seat);
        if (previousLives !== undefined && player.lives < previousLives) {
          this.lifeFlashAt = now;
        }
        this.lastLives.set(player.seat, player.lives);
      }
    } else {
      this.dealAt = now;
      this.lastLives = new Map(next.players.map((player) => [player.seat, player.lives]));
    }

    this.state = next;
    this.rebuildLayout();
    if (this.selectedCardId && !next.you.hand.some((card) => card.id === this.selectedCardId)) {
      this.selectedCardId = null;
    }
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(this.width * this.dpr);
    const pixelHeight = Math.round(this.height * this.dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.rebuildLayout();
  }

  private rebuildLayout(): void {
    if (!this.state) {
      return;
    }
    this.layout = computeLayout(this.state, this.width, this.height);
  }

  private readonly frame = (now: number): void => {
    if (!this.running) {
      return;
    }
    this.render(now);
    this.frameHandle = requestAnimationFrame(this.frame);
  };

  private render(now: number): void {
    const ctx = this.ctx;
    const layout = this.layout;
    const state = this.state;
    if (!layout || !state) {
      return;
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawTableBackground(ctx, layout);
    this.drawDeck(ctx, layout, state);

    for (const seat of layout.seats) {
      this.drawOpponentSeat(ctx, seat, state, now);
    }

    this.drawTableCards(ctx, layout, state, now);
    this.drawTrickGhosts(ctx, layout, now);
    this.drawOwnHand(ctx, layout, state, now);
    this.drawTurnHint(ctx, layout, state, now);
    this.drawMelou(ctx, layout, state);
  }

  private drawTableBackground(ctx: CanvasRenderingContext2D, layout: TableLayout): void {
    const { width, height, cx, cy } = layout;
    const theme = this.theme.canvas;
    const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.8);
    gradient.addColorStop(0, theme.table);
    gradient.addColorStop(0.72, theme.table);
    gradient.addColorStop(1, theme.tableEdge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = theme.tableLine;
    ctx.lineWidth = 1;
    const rx = Math.min(width * 0.4, width / 2 - 48);
    const ry = (height - layout.bottomReserved - 70) * 0.34;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.62, ry * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (nowRecent(this.lifeFlashAt, performance.now(), 550)) {
      const alpha = 0.22 * (1 - (performance.now() - this.lifeFlashAt) / 550);
      ctx.strokeStyle = theme.danger;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 10;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.globalAlpha = 1;
    }
  }

  private drawDeck(ctx: CanvasRenderingContext2D, layout: TableLayout, state: StateMessage): void {
    if ((state.game?.table.length ?? 0) > 0) {
      return;
    }
    const back = this.cache.getBack(
      layout.deck.w * 0.9,
      layout.deck.h * 0.9,
      this.theme.canvas,
      this.dpr,
    );
    for (let index = 2; index >= 0; index -= 1) {
      drawCardBitmap(
        ctx,
        back,
        layout.cx + index * 4,
        layout.cy - index * 4,
        layout.deck.w * 0.9,
        layout.deck.h * 0.9,
        -0.02 * index,
        0.9 - index * 0.08,
      );
    }
  }

  private drawOpponentSeat(
    ctx: CanvasRenderingContext2D,
    seat: SeatSlot,
    state: StateMessage,
    now: number,
  ): void {
    const theme = this.theme.canvas;
    const player = seat.player;
    const turn = state.game?.turnSeat === player.seat && !state.room.paused;
    const alpha = player.dead ? 0.42 : player.connected ? 1 : 0.68;

    ctx.save();
    ctx.globalAlpha = alpha;

    const faceCards = new Map<string, Card>();
    for (const entry of state.you.allHands ?? []) {
      if (entry.seat === player.seat) {
        for (const card of entry.cards) {
          faceCards.set(card.id, card);
        }
      }
    }

    for (let index = 0; index < seat.hand.length; index += 1) {
      const slot = seat.hand[index];
      if (!slot) {
        continue;
      }
      let cx = slot.cx;
      let cy = slot.cy;
      let cardAlpha = 1;
      if (this.dealAt > 0 && !this.reducedMotion && now - this.dealAt < 900) {
        const progress = clamp((now - this.dealAt - 150 - index * 28) / 320, 0, 1);
        const eased = easeOutCubic(progress);
        cx = lerp(this.layout?.cx ?? slot.cx, slot.cx, eased);
        cy = lerp(this.layout?.cy ?? slot.cy, slot.cy, eased);
        cardAlpha = eased;
      }
      const card = slot.cardId ? faceCards.get(slot.cardId) : undefined;
      if (seat.faceUp && card) {
        const cached = this.cache.getFace(card, slot.w, slot.h, theme, this.dpr);
        drawCardBitmap(ctx, cached, cx, cy, slot.w, slot.h, 0, cardAlpha);
      } else {
        const cached = this.cache.getBack(slot.w, slot.h, theme, this.dpr);
        drawCardBitmap(ctx, cached, cx, cy, slot.w, slot.h, 0, cardAlpha);
      }
    }

    const compact = this.width < 980;
    const labelWidth = compact
      ? Math.min(96, Math.max(62, this.width * 0.14))
      : Math.min(148, Math.max(92, this.width * 0.18));
    const labelHeight = compact ? 30 : 34;
    const labelX = seat.x - labelWidth / 2;
    const labelY = seat.y - labelHeight - 10;
    roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 9);
    ctx.fillStyle = theme.panel;
    ctx.globalAlpha = alpha * 0.92;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = turn ? theme.accent : theme.panelBorder;
    ctx.lineWidth = turn ? 2 : 1;
    if (turn) {
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = `600 ${compact ? 10 : 11}px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.text;
    const suffix = compact ? '' : player.isBot ? ' · bot' : !player.connected ? ' · off' : '';
    const title = fitText(ctx, `${player.name}${suffix}`, labelWidth - 14);
    ctx.fillText(title, labelX + 7, labelY + (compact ? 9 : 11));

    ctx.font = `500 ${compact ? 9 : 10}px ${SANS}`;
    ctx.fillStyle = theme.textMuted;
    const dealer = state.game?.dealerSeat === player.seat ? (compact ? ' D' : ' · D') : '';
    const status = player.dead
      ? 'morto'
      : compact
        ? `♥${player.lives} · ${player.bet ?? '—'}${dealer}`
        : `♥ ${player.lives} · aposta ${player.bet ?? '—'}${dealer}`;
    ctx.fillText(fitText(ctx, status, labelWidth - 14), labelX + 7, labelY + (compact ? 21 : 24));

    if (turn) {
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(labelX + labelWidth - 10, labelY + (compact ? 8 : 10), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawTableCards(
    ctx: CanvasRenderingContext2D,
    layout: TableLayout,
    state: StateMessage,
    now: number,
  ): void {
    const theme = this.theme.canvas;
    const players = new Map(state.players.map((player) => [player.seat, player]));

    for (const slot of layout.table) {
      let cx = slot.cx;
      let cy = slot.cy;
      let scale = 1;
      let alpha = 1;

      const animation = this.playAnimations.get(slot.cardId);
      if (animation && !this.reducedMotion) {
        const progress = clamp((now - animation.start) / 280, 0, 1);
        if (progress >= 1) {
          this.playAnimations.delete(slot.cardId);
        } else {
          const eased = easeOutCubic(progress);
          const from = this.seatAnchor(animation.seat, layout);
          cx = lerp(from.x, slot.cx, eased);
          cy = lerp(from.y, slot.cy, eased);
          scale = 0.7 + 0.3 * eased;
          alpha = 0.55 + 0.45 * eased;
        }
      }

      const cached = this.cache.getFace(slot.card, slot.w, slot.h, theme, this.dpr);
      drawCardBitmap(ctx, cached, cx, cy, slot.w * scale, slot.h * scale, 0, alpha);

      const player = players.get(slot.seat);
      const label = slot.seat === layout.ownSeat ? 'Você' : (player?.name ?? '');
      ctx.font = `500 10px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = theme.textMuted;
      ctx.fillText(fitText(ctx, label, slot.w + 10), slot.cx, slot.cy + slot.h / 2 + 7);

      if (state.game?.lastTrick?.winnerSeat === slot.seat) {
        ctx.save();
        ctx.strokeStyle = theme.gold;
        ctx.lineWidth = 2;
        ctx.shadowColor = theme.gold;
        ctx.shadowBlur = 10;
        roundRect(
          ctx,
          slot.cx - slot.w / 2 - 2,
          slot.cy - slot.h / 2 - 2,
          slot.w + 4,
          slot.h + 4,
          7,
        );
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawTrickGhosts(ctx: CanvasRenderingContext2D, layout: TableLayout, now: number): void {
    if (this.trickClearAt === 0 || this.reducedMotion) {
      return;
    }
    const progress = clamp((now - this.trickClearAt) / 520, 0, 1);
    if (progress >= 1) {
      this.trickClearAt = 0;
      this.trickGhosts = [];
      return;
    }
    const eased = easeOutCubic(progress);
    const target =
      this.trickWinnerSeat !== null
        ? this.seatAnchor(this.trickWinnerSeat, layout)
        : { x: layout.cx, y: layout.cy };

    for (const ghost of this.trickGhosts) {
      const cached = this.cache.getFace(
        ghost.card,
        ghost.slot.w,
        ghost.slot.h,
        this.theme.canvas,
        this.dpr,
      );
      drawCardBitmap(
        ctx,
        cached,
        lerp(ghost.slot.cx, target.x, eased),
        lerp(ghost.slot.cy, target.y, eased),
        ghost.slot.w * (1 - eased * 0.45),
        ghost.slot.h * (1 - eased * 0.45),
        lerp(0, 0.25, eased),
        1 - eased,
      );
    }
  }

  private drawOwnHand(
    ctx: CanvasRenderingContext2D,
    layout: TableLayout,
    state: StateMessage,
    now: number,
  ): void {
    if (layout.hand.length === 0) {
      return;
    }
    const theme = this.theme.canvas;
    const hand = new Map(state.you.hand.map((card) => [card.id, card]));
    const ordered = [...layout.hand].sort((a, b) => {
      if (a.cardId === this.selectedCardId) {
        return 1;
      }
      if (b.cardId === this.selectedCardId) {
        return -1;
      }
      return 0;
    });

    for (const slot of ordered) {
      const card = hand.get(slot.cardId);
      if (!card) {
        continue;
      }
      let cx = slot.cx;
      let cy = slot.cy;
      let alpha = 1;
      if (this.dealAt > 0 && !this.reducedMotion && now - this.dealAt < 1000) {
        const index = layout.hand.findIndex((entry) => entry.cardId === slot.cardId);
        const progress = clamp((now - this.dealAt - index * 35) / 320, 0, 1);
        const eased = easeOutCubic(progress);
        cx = lerp(layout.cx, slot.cx, eased);
        cy = lerp(layout.cy, slot.cy, eased);
        alpha = eased;
      }

      const selected = slot.cardId === this.selectedCardId;
      const hovered = slot.cardId === this.hoverCardId;
      const lift = selected ? 18 : hovered ? 7 : 0;
      const cached = this.cache.getFace(card, slot.w, slot.h, theme, this.dpr);
      drawCardBitmap(ctx, cached, cx, cy - lift, slot.w, slot.h, slot.rotation, alpha);

      if (selected || hovered) {
        ctx.save();
        ctx.translate(cx, cy - lift);
        ctx.rotate(slot.rotation);
        ctx.strokeStyle = selected ? theme.gold : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = selected ? 2.5 : 1.5;
        if (selected) {
          ctx.shadowColor = theme.gold;
          ctx.shadowBlur = 12;
        }
        roundRect(ctx, -slot.w / 2 - 2, -slot.h / 2 - 2, slot.w + 4, slot.h + 4, 7);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawTurnHint(
    ctx: CanvasRenderingContext2D,
    layout: TableLayout,
    state: StateMessage,
    now: number,
  ): void {
    const isOwnTurn =
      !state.room.paused &&
      (state.game?.phase === 'betting' || state.game?.phase === 'playing') &&
      state.game?.turnSeat === layout.ownSeat;
    if (!isOwnTurn || layout.hand.length === 0) {
      return;
    }
    const theme = this.theme.canvas;
    const pulse = 0.55 + Math.sin(now / 420) * 0.25;
    const first = layout.hand[0];
    const last = layout.hand[layout.hand.length - 1];
    if (!first || !last) {
      return;
    }
    const x = first.cx - first.w / 2 - 12;
    const y = first.cy + first.h / 2 + 1;
    const width = last.cx - first.cx + first.w + 24;
    ctx.save();
    ctx.globalAlpha = Math.max(0.25, pulse);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.restore();
  }

  private drawMelou(ctx: CanvasRenderingContext2D, layout: TableLayout, state: StateMessage): void {
    const lastTrick = state.game?.lastTrick;
    if (!lastTrick?.tie || (state.game?.table.length ?? 0) === 0) {
      return;
    }
    const theme = this.theme.canvas;
    const text = 'MELOU';
    ctx.save();
    ctx.font = `700 11px ${SANS}`;
    const width = ctx.measureText(text).width + 18;
    const x = layout.cx - width / 2;
    const y = (layout.table[0]?.cy ?? layout.cy) - (layout.table[0]?.h ?? 0) / 2 - 30;
    roundRect(ctx, x, y, width, 22, 11);
    ctx.fillStyle = theme.gold;
    ctx.fill();
    ctx.fillStyle = theme.cardPaper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, layout.cx, y + 11);
    ctx.restore();
  }

  private seatAnchor(seat: number, layout: TableLayout): { x: number; y: number } {
    if (seat === layout.ownSeat) {
      return { x: layout.cx, y: layout.height - layout.bottomReserved };
    }
    const found = layout.seats.find((entry) => entry.seat === seat);
    return found ? { x: found.x, y: found.y } : { x: layout.cx, y: layout.cy };
  }

  private cardAt(x: number, y: number): CardSlot | null {
    if (!this.layout) {
      return null;
    }
    for (const slot of this.layout.hand) {
      if (hitTestCard(slot, x, y, 3)) {
        return slot;
      }
    }
    return null;
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const slot = this.cardAt(event.clientX - rect.left, event.clientY - rect.top);
    if (slot?.cardId !== this.hoverCardId) {
      this.hoverCardId = slot?.cardId ?? null;
      this.updateCursor();
    }
  };

  private readonly handlePointerLeave = (): void => {
    if (this.hoverCardId !== null) {
      this.hoverCardId = null;
      this.updateCursor();
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const slot = this.cardAt(event.clientX - rect.left, event.clientY - rect.top);
    if (!slot) {
      return;
    }
    event.preventDefault();
    this.onCardClick?.(slot.cardId);
  };

  private updateCursor(): void {
    this.canvas.style.cursor =
      this.hoverCardId !== null ? 'pointer' : this.selectedCardId ? 'pointer' : 'default';
  }
}

function nowRecent(timestamp: number, now: number, windowMs: number): boolean {
  return timestamp > 0 && now - timestamp < windowMs;
}
