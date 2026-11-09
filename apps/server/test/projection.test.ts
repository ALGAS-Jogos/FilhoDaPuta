import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { projectRoom } from '../src/project.js';
import { Room } from '../src/room.js';

function fakeSocket(): WebSocket {
  return {
    readyState: 1,
    send: () => {},
    close: () => {},
  } as unknown as WebSocket;
}

describe('projeção de estado', () => {
  it('jogador morto vê todas as mãos; vivo e espectador não', () => {
    const room = new Room('ABCDE', 7, { onEmpty: () => {} });
    try {
      const ana = room.addHuman('ana', 'a'.repeat(32), 'Ana', fakeSocket());
      const bia = room.addHuman('bia', 'b'.repeat(32), 'Bia', fakeSocket());
      room.addBot(1);
      room.startGame(1);

      const anaState = room.state?.players.find((player) => player.seat === ana.seat);
      expect(anaState).toBeDefined();
      if (anaState) {
        anaState.dead = true;
        anaState.lives = 0;
        anaState.hand = [];
      }

      const deadView = projectRoom(room, { kind: 'player', player: ana });
      expect(deadView.you.dead).toBe(true);
      expect(deadView.you.hand).toEqual([]);
      expect(deadView.you.allHands?.length).toBeGreaterThan(0);
      expect(deadView.you.allHands?.every((entry) => entry.cards.length > 0)).toBe(true);

      const liveView = projectRoom(room, { kind: 'player', player: bia });
      expect(liveView.you.dead).toBe(false);
      expect(liveView.you.hand.length).toBeGreaterThan(0);
      expect(liveView.you.allHands).toBeNull();

      const spectatorView = projectRoom(room, {
        kind: 'spectator',
        spectator: {
          id: 'olho',
          token: 'c'.repeat(32),
          name: 'Olho',
          connected: true,
          socket: null,
        },
      });
      expect(spectatorView.you.isSpectator).toBe(true);
      expect(spectatorView.you.hand).toEqual([]);
      expect(spectatorView.you.allHands).toBeNull();
    } finally {
      room.destroy();
    }
  });
});
