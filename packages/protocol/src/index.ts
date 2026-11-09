import { z } from 'zod';

export const MAX_PLAYERS = 6;
export const MAX_NAME_LENGTH = 16;
export const ROOM_CODE_LENGTH = 5;
export const MAX_MESSAGE_BYTES = 8192;
export const TURN_MS = 35_000;
export const CONFIRM_MS = 15_000;
export const TRICK_DISPLAY_MS = 1_400;
export const RECONNECT_MIN_MS = 10_000;
export const ROOM_TTL_MS = 30 * 60 * 1000;

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'] as const;

export const CardSchema = z.object({
  id: z.string(),
  suit: z.enum(SUITS),
  rank: z.enum(RANKS),
  cardRank: z.number().int().min(1).max(14),
  isManilha: z.boolean(),
  manilhaRank: z.number().int().min(1).max(4).optional(),
});

export const PlayedCardSchema = z.object({
  seat: z.number().int(),
  card: CardSchema,
  order: z.number().int().min(0),
});

export const GamePhaseSchema = z.enum(['betting', 'playing', 'trickEnd', 'roundEnd', 'gameOver']);

export const PublicPlayerSchema = z.object({
  seat: z.number().int(),
  name: z.string(),
  isBot: z.boolean(),
  connected: z.boolean(),
  lives: z.number().int().min(0),
  bet: z.number().int().nullable(),
  tricksWon: z.number().int().min(0),
  cardCount: z.number().int().min(0),
  dead: z.boolean(),
  confirmed: z.boolean(),
});

export const TrickViewSchema = z.object({
  winnerSeat: z.number().int(),
  tie: z.boolean(),
  cards: z.array(PlayedCardSchema),
});

export const RoundResultEntrySchema = z.object({
  seat: z.number().int(),
  bet: z.number().int(),
  tricks: z.number().int(),
  lostLife: z.boolean(),
  lives: z.number().int(),
});

export const RoundResultSchema = z.object({
  results: z.array(RoundResultEntrySchema),
});

export const GameViewSchema = z.object({
  phase: GamePhaseSchema,
  round: z.number().int().min(1),
  cardsThisRound: z.number().int().min(1).max(7),
  dealerSeat: z.number().int(),
  turnSeat: z.number().int().nullable(),
  table: z.array(PlayedCardSchema),
  lastTrick: TrickViewSchema.nullable(),
  lastRound: RoundResultSchema.nullable(),
  winnerSeat: z.number().int().nullable(),
  deadline: z.number().int().nullable(),
});

export const VoteChoiceSchema = z.enum(['continue', 'wait']);

export const PauseViewSchema = z.object({
  disconnectedSeats: z.array(z.number().int()),
  eligibleSeats: z.array(z.number().int()),
  votes: z.array(
    z.object({
      seat: z.number().int(),
      choice: VoteChoiceSchema,
    }),
  ),
  startedAt: z.number().int(),
  majority: z.number().int(),
});

export const RoomStatusSchema = z.enum(['lobby', 'playing', 'finished']);

export const RoomViewSchema = z.object({
  code: z.string(),
  hostSeat: z.number().int().nullable(),
  maxPlayers: z.number().int().min(2).max(MAX_PLAYERS),
  status: RoomStatusSchema,
  paused: z.boolean(),
  pause: PauseViewSchema.nullable(),
  spectatorCount: z.number().int().min(0),
});

export const YouViewSchema = z.object({
  playerId: z.string(),
  seat: z.number().int().nullable(),
  name: z.string(),
  isHost: z.boolean(),
  isSpectator: z.boolean(),
  dead: z.boolean(),
  hand: z.array(CardSchema),
  allHands: z
    .array(
      z.object({
        seat: z.number().int(),
        cards: z.array(CardSchema),
      }),
    )
    .nullable(),
  canBet: z.boolean(),
  canPlay: z.boolean(),
  canConfirm: z.boolean(),
  canVote: z.boolean(),
});

export const StateMessageSchema = z.object({
  type: z.literal('state'),
  seq: z.number().int().min(0),
  serverNow: z.number().int(),
  room: RoomViewSchema,
  players: z.array(PublicPlayerSchema),
  game: GameViewSchema.nullable(),
  you: YouViewSchema,
});

export const WelcomeMessageSchema = z.object({
  type: z.literal('welcome'),
  playerId: z.string(),
  token: z.string(),
  roomCode: z.string(),
  spectator: z.boolean(),
  serverNow: z.number().int(),
});

export const ErrorCodeSchema = z.enum([
  'BAD_MESSAGE',
  'BAD_NAME',
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'ROOM_LIMIT',
  'GAME_STARTED',
  'NOT_ENOUGH_PLAYERS',
  'PLAYERS_DISCONNECTED',
  'NOT_HOST',
  'NOT_IN_GAME',
  'NOT_YOUR_TURN',
  'INVALID_BET',
  'CARD_NOT_IN_HAND',
  'CANNOT_CONFIRM',
  'CANNOT_VOTE',
  'TOKEN_INVALID',
  'RATE_LIMITED',
  'ROOM_CLOSED',
  'INTERNAL',
]);

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: ErrorCodeSchema,
  message: z.string(),
});

export const PongMessageSchema = z.object({
  type: z.literal('pong'),
  serverNow: z.number().int(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  StateMessageSchema,
  WelcomeMessageSchema,
  ErrorMessageSchema,
  PongMessageSchema,
]);

export const CreateRoomCommandSchema = z.object({
  type: z.literal('createRoom'),
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
});

export const JoinRoomCommandSchema = z.object({
  type: z.literal('joinRoom'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`)),
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH).optional(),
  token: z.string().min(16).max(256).optional(),
  spectate: z.boolean().optional(),
});

export const AddBotCommandSchema = z.object({ type: z.literal('addBot') });
export const RemoveBotCommandSchema = z.object({
  type: z.literal('removeBot'),
  seat: z.number().int().min(1).max(MAX_PLAYERS),
});
export const StartGameCommandSchema = z.object({ type: z.literal('startGame') });
export const RestartCommandSchema = z.object({ type: z.literal('restart') });
export const BetCommandSchema = z.object({
  type: z.literal('bet'),
  value: z.number().int().min(0).max(7),
});
export const PlayCardCommandSchema = z.object({
  type: z.literal('playCard'),
  cardId: z.string().min(1).max(64),
});
export const ConfirmCommandSchema = z.object({ type: z.literal('confirm') });
export const VoteCommandSchema = z.object({
  type: z.literal('vote'),
  choice: VoteChoiceSchema,
});
export const LeaveCommandSchema = z.object({ type: z.literal('leave') });
export const PingCommandSchema = z.object({ type: z.literal('ping') });

export const ClientMessageSchema = z.discriminatedUnion('type', [
  CreateRoomCommandSchema,
  JoinRoomCommandSchema,
  AddBotCommandSchema,
  RemoveBotCommandSchema,
  StartGameCommandSchema,
  RestartCommandSchema,
  BetCommandSchema,
  PlayCardCommandSchema,
  ConfirmCommandSchema,
  VoteCommandSchema,
  LeaveCommandSchema,
  PingCommandSchema,
]);

export type Card = z.infer<typeof CardSchema>;
export type PlayedCard = z.infer<typeof PlayedCardSchema>;
export type GamePhase = z.infer<typeof GamePhaseSchema>;
export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;
export type TrickView = z.infer<typeof TrickViewSchema>;
export type RoundResult = z.infer<typeof RoundResultSchema>;
export type GameView = z.infer<typeof GameViewSchema>;
export type PauseView = z.infer<typeof PauseViewSchema>;
export type RoomView = z.infer<typeof RoomViewSchema>;
export type RoomStatus = z.infer<typeof RoomStatusSchema>;
export type YouView = z.infer<typeof YouViewSchema>;
export type StateMessage = z.infer<typeof StateMessageSchema>;
export type WelcomeMessage = z.infer<typeof WelcomeMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type VoteChoice = z.infer<typeof VoteChoiceSchema>;
