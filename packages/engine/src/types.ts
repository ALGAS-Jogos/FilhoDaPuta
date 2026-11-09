export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | 'J' | 'Q' | 'K';

export interface Card {
  /** Identificador estável, ex.: `7_hearts`. */
  id: string;
  suit: Suit;
  rank: Rank;
  /** 1 (mais forte) a 14 (mais fraca). */
  cardRank: number;
  isManilha: boolean;
  /** 1..4 somente quando `isManilha`. */
  manilhaRank?: number;
}

export type GamePhase = 'betting' | 'playing' | 'trickEnd' | 'roundEnd' | 'gameOver';

export interface GamePlayer {
  seat: number;
  name: string;
  isBot: boolean;
  connected: boolean;
  lives: number;
  hand: Card[];
  bet: number | null;
  tricksWon: number;
  dead: boolean;
  confirmed: boolean;
}

export interface PlayedCard {
  seat: number;
  card: Card;
  /** Ordem de jogada dentro da vaza (0 = primeira). */
  order: number;
}

export interface TrickResult {
  winnerSeat: number;
  tie: boolean;
  cards: PlayedCard[];
}

export interface RoundResultEntry {
  seat: number;
  bet: number;
  tricks: number;
  lostLife: boolean;
  lives: number;
}

export interface RoundResult {
  results: RoundResultEntry[];
}

export interface GameState {
  phase: GamePhase;
  round: number;
  cardsThisRound: number;
  dealerSeat: number;
  turnSeat: number | null;
  players: GamePlayer[];
  /** Cartas ainda não distribuídas. Nunca sai do servidor. */
  deck: Card[];
  table: PlayedCard[];
  /** Cartas de vazas já recolhidas. */
  discard: Card[];
  lastTrick: TrickResult | null;
  lastRound: RoundResult | null;
  winnerSeat: number | null;
  passedTricks: number;
}

export interface NewPlayer {
  seat: number;
  name: string;
  isBot?: boolean;
  connected?: boolean;
}

export class GameError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}
