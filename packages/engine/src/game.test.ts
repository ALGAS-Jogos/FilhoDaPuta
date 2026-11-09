import { describe, expect, it } from 'vitest';
import {
  activePlayers,
  assertInvariants,
  autoAct,
  cardsForRound,
  clearTrick,
  confirmRound,
  createCard,
  createDeck,
  createGame,
  createRng,
  GameError,
  type GameState,
  type NewPlayer,
  type PlayedCard,
  placeBet,
  playCard,
  resolveTrickCards,
} from '../src/index.js';

function makePlayers(count: number): NewPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    seat: index + 1,
    name: `Jogador ${index + 1}`,
    isBot: true,
  }));
}

function played(
  seat: number,
  order: number,
  rank: Parameters<typeof createCard>[0],
  suit: Parameters<typeof createCard>[1],
): PlayedCard {
  return { seat, order, card: createCard(rank, suit) };
}

function finishCurrentStep(state: GameState, rng: ReturnType<typeof createRng>): void {
  assertInvariants(state);

  if (state.phase === 'betting' || state.phase === 'playing') {
    if (state.turnSeat === null) {
      throw new Error('turno nulo');
    }
    autoAct(state, state.turnSeat, rng);
    return;
  }

  if (state.phase === 'trickEnd') {
    clearTrick(state);
    return;
  }

  if (state.phase === 'roundEnd') {
    const pending = activePlayers(state).find((player) => !player.confirmed);
    if (!pending) {
      throw new Error('fim de rodada sem jogador pendente');
    }
    confirmRound(state, pending.seat, rng);
  }
}

describe('baralho', () => {
  it('tem 40 cartas únicas', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((card) => card.id)).size).toBe(40);
  });

  it('aplica os ranks de manilha', () => {
    expect(createCard('4', 'clubs').cardRank).toBe(1);
    expect(createCard('7', 'hearts').cardRank).toBe(2);
    expect(createCard('A', 'spades').cardRank).toBe(3);
    expect(createCard('7', 'diamonds').cardRank).toBe(4);
  });

  it('aplica a ordem das cartas normais', () => {
    expect(createCard('3', 'clubs').cardRank).toBe(5);
    expect(createCard('2', 'clubs').cardRank).toBe(6);
    expect(createCard('A', 'clubs').cardRank).toBe(7);
    expect(createCard('K', 'clubs').cardRank).toBe(8);
    expect(createCard('J', 'clubs').cardRank).toBe(9);
    expect(createCard('Q', 'clubs').cardRank).toBe(10);
    expect(createCard('7', 'clubs').cardRank).toBe(11);
    expect(createCard('6', 'clubs').cardRank).toBe(12);
    expect(createCard('5', 'clubs').cardRank).toBe(13);
    expect(createCard('4', 'hearts').cardRank).toBe(14);
  });

  it('limita a mão com 6 jogadores', () => {
    expect(cardsForRound(1, 6)).toBe(1);
    expect(cardsForRound(6, 6)).toBe(6);
    expect(cardsForRound(7, 6)).toBe(6);
    expect(cardsForRound(7, 5)).toBe(7);
  });
});

describe('resolução de vaza', () => {
  it('vence a menor carta', () => {
    const result = resolveTrickCards([
      played(1, 0, 'Q', 'clubs'),
      played(2, 1, '3', 'hearts'),
      played(3, 2, 'K', 'spades'),
    ]);
    expect(result.winnerSeat).toBe(2);
    expect(result.tie).toBe(false);
  });

  it('no empate, vence a última carta jogada', () => {
    const result = resolveTrickCards([
      played(1, 0, '3', 'clubs'),
      played(2, 1, '3', 'hearts'),
      played(3, 2, '4', 'spades'),
    ]);
    expect(result.winnerSeat).toBe(2);
    expect(result.tie).toBe(true);
  });

  it('no empate triplo, vence a última das empatadas', () => {
    const result = resolveTrickCards([
      played(1, 0, '2', 'clubs'),
      played(2, 1, '2', 'hearts'),
      played(3, 2, '2', 'spades'),
      played(4, 3, 'A', 'clubs'),
    ]);
    expect(result.winnerSeat).toBe(3);
    expect(result.tie).toBe(true);
  });
});

describe('apostas', () => {
  it('impede o dealer de igualar a soma ao número de cartas', () => {
    const rng = createRng(10);
    const state = createGame(makePlayers(2), 1, rng);
    expect(state.cardsThisRound).toBe(1);
    expect(state.turnSeat).toBe(2);

    placeBet(state, 2, 1);
    expect(state.turnSeat).toBe(1);
    expect(() => placeBet(state, 1, 0)).toThrowError(GameError);

    placeBet(state, 1, 1);
    expect(state.phase).toBe('playing');
    expect(state.turnSeat).toBe(2);
  });

  it('permite qualquer carta, sem seguir naipe', () => {
    const rng = createRng(11);
    const state = createGame(makePlayers(2), 1, rng);
    placeBet(state, 2, 0);
    placeBet(state, 1, 0);

    const leader = state.players.find((player) => player.seat === 2);
    const card = leader?.hand[0];
    expect(card).toBeDefined();
    expect(() => playCard(state, 2, card?.id ?? '')).not.toThrow();
  });
});

describe('partidas completas', () => {
  it.each([2, 3, 4, 5, 6])('termina e conserva cartas com %i jogadores', (count) => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rng = createRng(seed * 1000 + count);
      const state = createGame(makePlayers(count), 1, rng);
      let steps = 0;

      while (state.phase !== 'gameOver') {
        steps += 1;
        if (steps > 20_000) {
          throw new Error(`partida não terminou: ${count} jogadores, seed ${seed}`);
        }
        finishCurrentStep(state, rng);
      }

      assertInvariants(state);
      expect(activePlayers(state).length).toBeLessThanOrEqual(1);
      expect(steps).toBeGreaterThan(0);
    }
  });
});
