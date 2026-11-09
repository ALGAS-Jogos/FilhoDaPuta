import { cardsForRound, createDeck, MAX_CARDS_PER_ROUND, STARTING_LIVES } from './cards.js';
import { type Rng, shuffle } from './rng.js';
import {
  GameError,
  type GamePlayer,
  type GameState,
  type NewPlayer,
  type PlayedCard,
  type RoundResultEntry,
  type TrickResult,
} from './types.js';

export function createGame(players: NewPlayer[], dealerSeat: number, rng: Rng): GameState {
  if (players.length < 2 || players.length > 6) {
    throw new GameError('INVALID_PLAYERS', 'A partida precisa de 2 a 6 jogadores.');
  }
  const seats = new Set<number>();
  for (const player of players) {
    if (!Number.isInteger(player.seat) || player.seat < 1) {
      throw new GameError('INVALID_SEAT', 'Assento inválido.');
    }
    if (seats.has(player.seat)) {
      throw new GameError('DUPLICATE_SEAT', 'Assento duplicado.');
    }
    seats.add(player.seat);
  }

  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const initialDealer = ordered.some((player) => player.seat === dealerSeat)
    ? dealerSeat
    : (ordered[0]?.seat ?? 1);

  const state: GameState = {
    phase: 'betting',
    round: 1,
    cardsThisRound: 0,
    dealerSeat: initialDealer,
    turnSeat: null,
    players: ordered.map((player) => ({
      seat: player.seat,
      name: player.name,
      isBot: player.isBot ?? false,
      connected: player.connected ?? true,
      lives: STARTING_LIVES,
      hand: [],
      bet: null,
      tricksWon: 0,
      dead: false,
      confirmed: false,
    })),
    deck: [],
    table: [],
    discard: [],
    lastTrick: null,
    lastRound: null,
    winnerSeat: null,
    passedTricks: 0,
  };

  startRound(state, rng);
  return state;
}

function startRound(state: GameState, rng: Rng): void {
  const active = activePlayers(state);
  if (active.length < 2) {
    state.phase = 'gameOver';
    state.turnSeat = null;
    state.winnerSeat = active[0]?.seat ?? null;
    state.lastTrick = null;
    state.table = [];
    return;
  }

  state.dealerSeat = ensureActiveSeat(state, state.dealerSeat);
  state.cardsThisRound = cardsForRound(state.round, active.length);
  state.deck = shuffle(createDeck(), rng);
  state.table = [];
  state.discard = [];
  state.lastTrick = null;
  state.lastRound = null;
  state.winnerSeat = null;
  state.passedTricks = 0;

  for (const player of state.players) {
    player.hand = [];
    player.bet = null;
    player.tricksWon = 0;
    player.confirmed = false;
  }

  for (let cardIndex = 0; cardIndex < state.cardsThisRound; cardIndex += 1) {
    for (const player of active) {
      const card = state.deck.pop();
      if (!card) {
        throw new GameError('DECK_EXHAUSTED', 'Baralho insuficiente para a rodada.');
      }
      player.hand.push(card);
    }
  }

  state.phase = 'betting';
  state.turnSeat = nextActiveSeat(state, state.dealerSeat);
}

export function placeBet(state: GameState, seat: number, value: number): void {
  assertPhase(state, 'betting');
  const player = requireActivePlayer(state, seat);
  if (state.turnSeat !== seat) {
    throw new GameError('NOT_YOUR_TURN', 'Não é o seu turno.');
  }
  if (!Number.isInteger(value) || value < 0 || value > state.cardsThisRound) {
    throw new GameError('INVALID_BET', 'Aposta inválida.');
  }
  if (seat === state.dealerSeat) {
    const others = state.players
      .filter((candidate) => !candidate.dead && candidate.seat !== seat)
      .reduce((total, candidate) => total + (candidate.bet ?? 0), 0);
    if (others + value === state.cardsThisRound) {
      throw new GameError(
        'INVALID_BET',
        'O dealer não pode igualar a soma das apostas ao número de cartas.',
      );
    }
  }

  player.bet = value;

  const everyoneBet = activePlayers(state).every((candidate) => candidate.bet !== null);
  if (everyoneBet) {
    state.phase = 'playing';
    state.turnSeat = nextActiveSeat(state, state.dealerSeat);
  } else {
    state.turnSeat = nextActiveSeat(state, seat);
  }
}

export function autoBet(state: GameState, seat: number): void {
  assertPhase(state, 'betting');
  const player = requireActivePlayer(state, seat);
  if (state.turnSeat !== seat) {
    throw new GameError('NOT_YOUR_TURN', 'Não é o seu turno.');
  }

  let chosen = 0;
  if (seat === state.dealerSeat) {
    const others = state.players
      .filter((candidate) => !candidate.dead && candidate.seat !== seat)
      .reduce((total, candidate) => total + (candidate.bet ?? 0), 0);
    for (let value = 0; value <= state.cardsThisRound; value += 1) {
      if (others + value !== state.cardsThisRound) {
        chosen = value;
        break;
      }
    }
  }

  player.bet = chosen;
  const everyoneBet = activePlayers(state).every((candidate) => candidate.bet !== null);
  if (everyoneBet) {
    state.phase = 'playing';
    state.turnSeat = nextActiveSeat(state, state.dealerSeat);
  } else {
    state.turnSeat = nextActiveSeat(state, seat);
  }
}

export function playCard(state: GameState, seat: number, cardId: string): void {
  assertPhase(state, 'playing');
  const player = requireActivePlayer(state, seat);
  if (state.turnSeat !== seat) {
    throw new GameError('NOT_YOUR_TURN', 'Não é o seu turno.');
  }

  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index < 0) {
    throw new GameError('CARD_NOT_IN_HAND', 'Essa carta não está na sua mão.');
  }
  const [card] = player.hand.splice(index, 1);
  if (!card) {
    throw new GameError('CARD_NOT_IN_HAND', 'Essa carta não está na sua mão.');
  }

  state.table.push({ seat, card, order: state.table.length });

  if (state.table.length >= activePlayers(state).length) {
    resolveCurrentTrick(state);
  } else {
    state.turnSeat = nextActiveSeat(state, seat);
  }
}

export function autoPlay(state: GameState, seat: number): void {
  assertPhase(state, 'playing');
  const player = requireActivePlayer(state, seat);
  if (state.turnSeat !== seat) {
    throw new GameError('NOT_YOUR_TURN', 'Não é o seu turno.');
  }
  if (player.hand.length === 0) {
    throw new GameError('NO_CARDS', 'Jogador sem cartas.');
  }

  let weakest = player.hand[0];
  for (const card of player.hand) {
    if (!weakest || card.cardRank > weakest.cardRank) {
      weakest = card;
    }
  }
  if (!weakest) {
    throw new GameError('NO_CARDS', 'Jogador sem cartas.');
  }
  playCard(state, seat, weakest.id);
}

/** Resolve uma vaza a partir das cartas jogadas; exposto para testes. */
export function resolveTrickCards(cards: PlayedCard[]): TrickResult {
  if (cards.length === 0) {
    throw new GameError('EMPTY_TRICK', 'Vaza sem cartas.');
  }
  const minimum = Math.min(...cards.map((played) => played.card.cardRank));
  const tied = cards.filter((played) => played.card.cardRank === minimum);
  let winner = tied[0];
  for (const candidate of tied) {
    if (!winner || candidate.order > winner.order) {
      winner = candidate;
    }
  }
  if (!winner) {
    throw new GameError('EMPTY_TRICK', 'Vaza sem vencedor.');
  }
  return {
    winnerSeat: winner.seat,
    tie: tied.length > 1,
    cards: [...cards],
  };
}

function resolveCurrentTrick(state: GameState): void {
  const result = resolveTrickCards(state.table);
  state.lastTrick = result;
  state.passedTricks += 1;

  const winner = requirePlayer(state, result.winnerSeat);
  winner.tricksWon += 1;

  if (state.passedTricks >= state.cardsThisRound) {
    finishRound(state);
    return;
  }

  state.phase = 'trickEnd';
  state.turnSeat = result.winnerSeat;
}

export function clearTrick(state: GameState): void {
  assertPhase(state, 'trickEnd');
  const winnerSeat = state.lastTrick?.winnerSeat ?? state.turnSeat;
  state.discard.push(...state.table.map((played) => played.card));
  state.table = [];
  state.phase = 'playing';
  state.turnSeat = winnerSeat;
}

function finishRound(state: GameState): void {
  const active = activePlayers(state);
  const results: RoundResultEntry[] = [];

  for (const player of active) {
    const bet = player.bet ?? 0;
    const tricks = player.tricksWon;
    const lostLife = bet !== tricks;
    if (lostLife) {
      player.lives = Math.max(0, player.lives - 1);
    }
    if (player.lives === 0) {
      player.dead = true;
      player.hand = [];
    }
    results.push({
      seat: player.seat,
      bet,
      tricks,
      lostLife,
      lives: player.lives,
    });
  }

  state.lastRound = { results };

  const alive = activePlayers(state);
  if (alive.length <= 1) {
    state.phase = 'gameOver';
    state.turnSeat = null;
    state.winnerSeat = alive[0]?.seat ?? null;
    for (const player of state.players) {
      player.confirmed = false;
    }
    return;
  }

  state.phase = 'roundEnd';
  state.turnSeat = null;
  for (const player of state.players) {
    player.confirmed = false;
  }
}

export function confirmRound(state: GameState, seat: number, rng: Rng): void {
  assertPhase(state, 'roundEnd');
  const player = requireActivePlayer(state, seat);
  if (player.confirmed) {
    return;
  }
  player.confirmed = true;

  const active = activePlayers(state);
  if (active.every((candidate) => candidate.confirmed)) {
    state.round = Math.min(state.round + 1, MAX_CARDS_PER_ROUND);
    state.dealerSeat = nextActiveSeat(state, state.dealerSeat);
    startRound(state, rng);
  }
}

export function activePlayers(state: GameState): GamePlayer[] {
  return state.players.filter((player) => !player.dead).sort((a, b) => a.seat - b.seat);
}

export function totalBet(state: GameState): number {
  return state.players.reduce((total, player) => total + (player.bet ?? 0), 0);
}

export function nextActiveSeat(state: GameState, fromSeat: number): number {
  const seats = activePlayers(state).map((player) => player.seat);
  if (seats.length === 0) {
    throw new GameError('NO_PLAYERS', 'Não há jogadores vivos.');
  }
  const next = seats.find((seat) => seat > fromSeat);
  return next ?? (seats[0] as number);
}

function ensureActiveSeat(state: GameState, seat: number): number {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (player && !player.dead) {
    return seat;
  }
  return nextActiveSeat(state, seat);
}

function requirePlayer(state: GameState, seat: number): GamePlayer {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (!player) {
    throw new GameError('PLAYER_NOT_FOUND', 'Jogador não encontrado.');
  }
  return player;
}

function requireActivePlayer(state: GameState, seat: number): GamePlayer {
  const player = requirePlayer(state, seat);
  if (player.dead) {
    throw new GameError('PLAYER_DEAD', 'Jogador morto não participa da rodada.');
  }
  return player;
}

function assertPhase(state: GameState, phase: GameState['phase']): void {
  if (state.phase !== phase) {
    throw new GameError('WRONG_PHASE', `Fase atual: ${state.phase}.`);
  }
}

export function autoAct(state: GameState, seat: number, rng: Rng): void {
  switch (state.phase) {
    case 'betting':
      autoBet(state, seat);
      break;
    case 'playing':
      autoPlay(state, seat);
      break;
    case 'roundEnd':
      confirmRound(state, seat, rng);
      break;
    case 'trickEnd':
      clearTrick(state);
      break;
    default:
      break;
  }
}

export function handCounts(state: GameState): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const player of state.players) {
    counts[player.seat] = player.hand.length;
  }
  return counts;
}
