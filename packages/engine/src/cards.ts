import type { Card, Rank, Suit } from './types.js';

export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MAX_CARDS_PER_ROUND = 7;
export const DECK_SIZE = 40;
export const STARTING_LIVES = 3;

const MANILHAS: Readonly<Record<string, number>> = {
  '4_clubs': 1,
  '7_hearts': 2,
  A_spades: 3,
  '7_diamonds': 4,
};

const NORMAL_RANKS: Readonly<Record<string, number>> = {
  '3': 5,
  '2': 6,
  A: 7,
  K: 8,
  J: 9,
  Q: 10,
  '7': 11,
  '6': 12,
  '5': 13,
  '4': 14,
};

export function cardId(rank: Rank, suit: Suit): string {
  return `${rank}_${suit}`;
}

export function createCard(rank: Rank, suit: Suit): Card {
  const id = cardId(rank, suit);
  const manilhaRank = MANILHAS[id];
  const isManilha = manilhaRank !== undefined;
  return {
    id,
    suit,
    rank,
    cardRank: isManilha ? manilhaRank : (NORMAL_RANKS[rank] ?? 99),
    isManilha,
    ...(isManilha ? { manilhaRank } : {}),
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export function cardsForRound(round: number, activePlayers: number): number {
  const byPlayers = Math.floor(DECK_SIZE / Math.max(1, activePlayers));
  return Math.max(1, Math.min(round, MAX_CARDS_PER_ROUND, byPlayers));
}
