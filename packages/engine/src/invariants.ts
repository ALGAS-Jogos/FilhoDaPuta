import { cardsForRound, DECK_SIZE, MAX_CARDS_PER_ROUND, STARTING_LIVES } from './cards.js';
import { activePlayers } from './game.js';
import type { GameState } from './types.js';

/**
 * Verifica conservação e consistência. Usado em testes e no servidor em
 * desenvolvimento; não deve derrubar uma partida em produção.
 */
export function assertInvariants(state: GameState): void {
  if (state.players.length < 2 || state.players.length > 6) {
    throw new Error(`invariante: quantidade de jogadores ${state.players.length}`);
  }

  const seats = new Set<number>();
  for (const player of state.players) {
    if (seats.has(player.seat)) {
      throw new Error(`invariante: assento duplicado ${player.seat}`);
    }
    seats.add(player.seat);
    if (player.lives < 0 || player.lives > STARTING_LIVES) {
      throw new Error(`invariante: vidas inválidas no assento ${player.seat}`);
    }
    if (player.dead && player.hand.length > 0) {
      throw new Error(`invariante: jogador morto com cartas no assento ${player.seat}`);
    }
  }

  const cardIds: string[] = [];
  for (const card of state.deck) {
    cardIds.push(card.id);
  }
  for (const player of state.players) {
    for (const card of player.hand) {
      cardIds.push(card.id);
    }
  }
  for (const played of state.table) {
    cardIds.push(played.card.id);
  }
  for (const card of state.discard) {
    cardIds.push(card.id);
  }

  if (cardIds.length !== DECK_SIZE) {
    throw new Error(`invariante: ${cardIds.length} cartas no total, esperado ${DECK_SIZE}`);
  }
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error('invariante: carta duplicada');
  }
  if (state.cardsThisRound < 1 || state.cardsThisRound > MAX_CARDS_PER_ROUND) {
    throw new Error(`invariante: cartas por rodada ${state.cardsThisRound}`);
  }

  const active = activePlayers(state);
  if (state.phase === 'betting') {
    if (state.table.length > 0) {
      throw new Error('invariante: mesa com cartas na fase de apostas');
    }
    if (active.length < 2) {
      throw new Error('invariante: apostas com menos de 2 vivos');
    }
    const expected = cardsForRound(state.round, active.length);
    if (state.cardsThisRound !== expected) {
      throw new Error(`invariante: mão ${state.cardsThisRound}, esperado ${expected}`);
    }
    for (const player of active) {
      if (player.hand.length !== state.cardsThisRound) {
        throw new Error(`invariante: mão incompleta no assento ${player.seat}`);
      }
    }
  }

  if (state.phase === 'playing' || state.phase === 'betting') {
    if (state.turnSeat === null) {
      throw new Error('invariante: turno nulo');
    }
    const turnPlayer = state.players.find((player) => player.seat === state.turnSeat);
    if (!turnPlayer || turnPlayer.dead) {
      throw new Error('invariante: turno de jogador morto/inexistente');
    }
  }

  if (state.phase === 'playing') {
    if (!active.every((player) => player.bet !== null)) {
      throw new Error('invariante: jogo começou com aposta pendente');
    }
    if (state.table.length >= active.length && active.length > 0) {
      throw new Error('invariante: mesa cheia sem resolução de vaza');
    }
  }

  if (state.phase === 'trickEnd' && !state.lastTrick) {
    throw new Error('invariante: fim de vaza sem resultado');
  }

  if ((state.phase === 'roundEnd' || state.phase === 'gameOver') && !state.lastRound) {
    throw new Error('invariante: fim de rodada sem resultado');
  }

  if (state.phase === 'gameOver' && active.length > 1) {
    throw new Error('invariante: fim de jogo com mais de um vivo');
  }
}
