import type { Card, PlayedCard, PublicPlayer, StateMessage } from '@manilha/protocol';
import { CARD_RATIO } from './cards';

export interface CardSlot {
  cardId: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
}

export interface PlayedSlot extends CardSlot {
  seat: number;
  order: number;
  card: Card;
}

export interface SeatSlot {
  seat: number;
  player: PublicPlayer;
  x: number;
  y: number;
  angle: number;
  side: 'left' | 'top' | 'right';
  hand: CardSlot[];
  faceUp: boolean;
}

export interface TableLayout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  ownSeat: number | null;
  hand: CardSlot[];
  table: PlayedSlot[];
  seats: SeatSlot[];
  deck: { x: number; y: number; w: number; h: number };
  bottomReserved: number;
}

const clamp = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value));

function relativeOrder(seat: number, ownSeat: number | null, total: number): number {
  if (ownSeat === null) {
    return seat;
  }
  return (seat - ownSeat + total) % total;
}

export function computeLayout(view: StateMessage, width: number, height: number): TableLayout {
  const ownSeat = view.you.seat;
  const players = [...view.players].sort((a, b) => a.seat - b.seat);
  const ownHand = view.you.hand;
  const bottomReserved = ownHand.length > 0 || view.you.dead ? clamp(94, 124, height * 0.145) : 28;
  const topReserved = clamp(64, 88, height * 0.11);
  const cx = width / 2;
  const cy = topReserved + (height - topReserved - bottomReserved) / 2;
  const rx = Math.max(80, Math.min(width * 0.39, width / 2 - 72));
  const ry = Math.max(70, (height - topReserved - bottomReserved) * 0.33);

  const tableCount = Math.max(1, view.game?.table.length ?? 1);
  const tableCardW = clamp(38, 96, (width * 0.8 - (tableCount - 1) * 10) / tableCount);
  const tableCardH = tableCardW / CARD_RATIO;

  const handCount = Math.max(1, ownHand.length);
  const handArea = width - 28;
  const overlap = 0.42;
  const handCardW =
    ownHand.length === 0 ? 0 : clamp(48, 116, handArea / (1 + (handCount - 1) * (1 - overlap)));
  const handCardH = handCardW / CARD_RATIO;
  const handStep = ownHand.length <= 1 ? 0 : handCardW * (1 - overlap);
  const handTotal = ownHand.length * handCardW + Math.max(0, ownHand.length - 1) * handStep;
  const handStart = cx - handTotal / 2 + handCardW / 2;
  const handBaseY = height - bottomReserved - 12 - handCardH / 2;

  const hand: CardSlot[] = ownHand.map((card, index) => {
    const mid = (ownHand.length - 1) / 2;
    const distance = mid === 0 ? 0 : Math.abs(index - mid) / mid;
    return {
      cardId: card.id,
      cx: handStart + index * handStep,
      cy: handBaseY - (1 - distance) * Math.min(10, handCardH * 0.08),
      w: handCardW,
      h: handCardH,
      rotation: (index - mid) * 0.018,
    };
  });

  const tableWidth =
    tableCount * tableCardW + Math.max(0, tableCount - 1) * Math.max(6, tableCardW * 0.08);
  const tableStart = cx - tableWidth / 2 + tableCardW / 2;
  const table: PlayedSlot[] = (view.game?.table ?? []).map((played: PlayedCard, index) => ({
    cardId: played.card.id,
    card: played.card,
    seat: played.seat,
    order: played.order,
    cx: tableStart + index * (tableCardW + Math.max(6, tableCardW * 0.08)),
    cy,
    w: tableCardW,
    h: tableCardH,
    rotation: 0,
  }));

  const others = players
    .filter((player) => player.seat !== ownSeat)
    .sort(
      (a, b) =>
        relativeOrder(a.seat, ownSeat, players.length) -
        relativeOrder(b.seat, ownSeat, players.length),
    );
  const k = Math.max(1, others.length);
  const miniW = clamp(24, 42, width * 0.042);
  const miniH = miniW / CARD_RATIO;

  const allHands = new Map<number, Card[]>();
  for (const entry of view.you.allHands ?? []) {
    allHands.set(entry.seat, entry.cards);
  }

  const seats: SeatSlot[] = others.map((player, index) => {
    const angle = Math.PI + ((index + 1) * Math.PI) / (k + 1);
    const x = clamp(56, width - 56, cx + Math.cos(angle) * rx);
    const y = clamp(topReserved + 20, cy + ry * 0.55, cy + Math.sin(angle) * ry);
    const side: SeatSlot['side'] =
      x < cx - width * 0.16 ? 'left' : x > cx + width * 0.16 ? 'right' : 'top';
    const revealed = allHands.get(player.seat);
    const count = revealed?.length ?? player.cardCount;
    const step = Math.min(miniW * 0.62, miniW * 0.52);
    const totalWidth = count > 0 ? miniW + (count - 1) * step : 0;
    const startX = x - totalWidth / 2 + miniW / 2;
    const handSlots: CardSlot[] = Array.from({ length: count }, (_, cardIndex) => ({
      cardId: revealed?.[cardIndex]?.id ?? '',
      cx: startX + cardIndex * step,
      cy: y + miniH * 0.55,
      w: miniW,
      h: miniH,
      rotation: 0,
    }));
    return {
      seat: player.seat,
      player,
      x,
      y,
      angle,
      side,
      hand: handSlots,
      faceUp: Boolean(revealed),
    };
  });

  return {
    width,
    height,
    cx,
    cy,
    ownSeat,
    hand,
    table,
    seats,
    deck: {
      x: cx - tableCardW / 2,
      y: cy - tableCardH / 2,
      w: tableCardW,
      h: tableCardH,
    },
    bottomReserved,
  };
}

export function hitTestCard(slot: CardSlot, x: number, y: number, padding = 4): boolean {
  const dx = x - slot.cx;
  const dy = y - slot.cy;
  const cos = Math.cos(-slot.rotation);
  const sin = Math.sin(-slot.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return Math.abs(localX) <= slot.w / 2 + padding && Math.abs(localY) <= slot.h / 2 + padding;
}
