import { STARTING_LIVES } from '@fdp/engine';
import {
  type GameView,
  MAX_PLAYERS,
  type PublicPlayer,
  type RoomView,
  type StateMessage,
  type YouView,
} from '@fdp/protocol';
import type { Room, RoomPlayer, RoomSpectator } from './room.js';

export type ProjectionViewer =
  | { kind: 'player'; player: RoomPlayer }
  | { kind: 'spectator'; spectator: RoomSpectator };

export function projectRoom(room: Room, viewer: ProjectionViewer): StateMessage {
  const state = room.state;
  const enginePlayer =
    viewer.kind === 'player'
      ? state?.players.find((candidate) => candidate.seat === viewer.player.seat)
      : undefined;

  const players: PublicPlayer[] = room.players.map((candidate) => {
    const projection = state?.players.find((entry) => entry.seat === candidate.seat);
    return {
      seat: candidate.seat,
      name: candidate.name,
      isBot: candidate.isBot,
      connected: candidate.connected,
      lives: projection?.lives ?? STARTING_LIVES,
      bet: projection?.bet ?? null,
      tricksWon: projection?.tricksWon ?? 0,
      cardCount: projection?.hand.length ?? 0,
      dead: projection?.dead ?? false,
      confirmed: projection?.confirmed ?? false,
    };
  });

  const game: GameView | null = state
    ? {
        phase: state.phase,
        round: state.round,
        cardsThisRound: state.cardsThisRound,
        dealerSeat: state.dealerSeat,
        turnSeat: state.turnSeat,
        table: state.table,
        lastTrick: state.lastTrick,
        lastRound: state.lastRound,
        winnerSeat: state.winnerSeat,
        deadline: room.paused ? null : room.deadline,
      }
    : null;

  const roomView: RoomView = {
    code: room.code,
    hostSeat: room.hostSeat,
    maxPlayers: MAX_PLAYERS,
    status: !state ? 'lobby' : state.phase === 'gameOver' ? 'finished' : 'playing',
    paused: room.paused,
    pause: room.pause
      ? {
          disconnectedSeats: [...room.pause.disconnectedSeats],
          eligibleSeats: [...room.pause.eligibleSeats],
          votes: [...room.pause.votes.entries()].map(([seat, choice]) => ({ seat, choice })),
          startedAt: room.pause.startedAt,
          majority: room.pause.majority,
        }
      : null,
    spectatorCount: room.spectatorCount(),
  };

  let you: YouView;
  if (viewer.kind === 'spectator') {
    you = {
      playerId: viewer.spectator.id,
      seat: null,
      name: viewer.spectator.name,
      isHost: false,
      isSpectator: true,
      dead: false,
      hand: [],
      allHands: null,
      canBet: false,
      canPlay: false,
      canConfirm: false,
      canVote: false,
    };
  } else {
    const isDead = enginePlayer?.dead ?? false;
    const canAct = !room.paused && !viewer.player.isBot && viewer.player.connected;
    you = {
      playerId: viewer.player.id,
      seat: viewer.player.seat,
      name: viewer.player.name,
      isHost: room.hostSeat === viewer.player.seat,
      isSpectator: false,
      dead: isDead,
      hand: enginePlayer?.hand ?? [],
      allHands:
        isDead && state
          ? state.players
              .filter((candidate) => !candidate.dead)
              .map((candidate) => ({ seat: candidate.seat, cards: candidate.hand }))
          : null,
      canBet:
        canAct && state?.phase === 'betting' && state.turnSeat === viewer.player.seat && !isDead,
      canPlay:
        canAct && state?.phase === 'playing' && state.turnSeat === viewer.player.seat && !isDead,
      canConfirm: canAct && state?.phase === 'roundEnd' && !isDead && !enginePlayer?.confirmed,
      canVote:
        room.paused &&
        Boolean(room.pause?.eligibleSeats.includes(viewer.player.seat)) &&
        viewer.player.connected &&
        !viewer.player.isBot,
    };
  }

  return {
    type: 'state',
    seq: room.seq,
    serverNow: Date.now(),
    room: roomView,
    players,
    game,
    you,
  };
}
