import { randomBytes, randomInt } from 'node:crypto';
import { ROOM_CODE_LENGTH, ROOM_TTL_MS } from '@fdp/protocol';
import { ServerError } from './errors.js';
import { Room } from './room.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface RoomManagerOptions {
  maxRooms: number;
  roomTtlMs: number;
  seed?: number;
  log?: (message: string, error?: unknown) => void;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly options: RoomManagerOptions) {}

  create(): Room {
    if (this.rooms.size >= this.options.maxRooms) {
      throw new ServerError('ROOM_LIMIT', 'Limite de salas atingido. Tente mais tarde.');
    }

    const code = this.generateCode();
    const seed = this.options.seed ?? randomBytes(4).readUInt32BE(0);
    const room = new Room(code, seed, {
      onEmpty: (emptyRoom) => {
        this.rooms.delete(emptyRoom.code);
      },
      log: this.options.log,
    });
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  count(): number {
    return this.rooms.size;
  }

  remove(room: Room): void {
    room.destroy();
    this.rooms.delete(room.code);
  }

  cleanup(now = Date.now()): void {
    for (const room of this.rooms.values()) {
      if (room.connectedActors() === 0 && now - room.lastActivity > this.options.roomTtlMs) {
        room.destroy();
        this.rooms.delete(room.code);
      }
    }
  }

  destroyAll(): void {
    for (const room of this.rooms.values()) {
      room.destroy();
    }
    this.rooms.clear();
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      let code = '';
      for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    throw new ServerError('ROOM_LIMIT', 'Não foi possível gerar um código de sala.');
  }
}

export { ROOM_TTL_MS };
