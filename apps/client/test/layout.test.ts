import type { Card, PlayedCard, PublicPlayer, StateMessage } from '@manilha/protocol';
import { describe, expect, it } from 'vitest';
import { computeLayout } from '../src/lib/render/layout';

function card(index: number): Card {
  return {
    id: `card-${index}`,
    suit: 'hearts',
    rank: '3',
    cardRank: 5,
    isManilha: false,
  };
}

function player(seat: number): PublicPlayer {
  return {
    seat,
    name: `Jogador ${seat}`,
    isBot: false,
    connected: true,
    lives: 3,
    bet: 1,
    tricksWon: 0,
    cardCount: 7,
    dead: false,
    confirmed: false,
  };
}

function makeState(handSize: number, tableSize: number): StateMessage {
  const hand = Array.from({ length: handSize }, (_, index) => card(index));
  const table: PlayedCard[] = Array.from({ length: tableSize }, (_, index) => ({
    seat: (index % 6) + 1,
    card: card(index + 20),
    order: index,
  }));
  return {
    type: 'state',
    seq: 1,
    serverNow: 0,
    room: {
      code: 'ABCDE',
      hostSeat: 1,
      maxPlayers: 6,
      status: 'playing',
      paused: false,
      pause: null,
      spectatorCount: 0,
    },
    players: Array.from({ length: 6 }, (_, index) => player(index + 1)),
    game: {
      phase: 'playing',
      round: 7,
      cardsThisRound: 7,
      dealerSeat: 1,
      turnSeat: 1,
      table,
      lastTrick: null,
      lastRound: null,
      winnerSeat: null,
      deadline: null,
    },
    you: {
      playerId: 'p1',
      seat: 1,
      name: 'Jogador 1',
      isHost: true,
      isSpectator: false,
      dead: false,
      hand,
      allHands: null,
      canBet: false,
      canPlay: true,
      canConfirm: false,
      canVote: false,
    },
  };
}

function expectCentered(slots: Array<{ cx: number; w: number }>, width: number): void {
  const first = slots[0];
  const last = slots[slots.length - 1];
  expect(first).toBeDefined();
  expect(last).toBeDefined();
  if (!first || !last) {
    return;
  }
  expect(first.cx - first.w / 2).toBeGreaterThanOrEqual(0);
  expect(last.cx + last.w / 2).toBeLessThanOrEqual(width);
  expect((first.cx + last.cx) / 2).toBeCloseTo(width / 2, 5);
}

describe('layout das cartas', () => {
  it.each([390, 760, 1280])('centraliza 7 cartas na mão em %ipx', (width) => {
    const layout = computeLayout(makeState(7, 0), width, width === 390 ? 844 : 900);
    expect(layout.hand).toHaveLength(7);
    expectCentered(layout.hand, width);
  });

  it.each([390, 760, 1280])('centraliza as cartas jogadas em %ipx', (width) => {
    const layout = computeLayout(makeState(7, 6), width, width === 390 ? 844 : 900);
    expect(layout.table).toHaveLength(6);
    expectCentered(layout.table, width);
  });
});
