# Protocolo WebSocket

Endpoint: `/ws` (mesmo host do cliente; WSS no deploy).

Mensagens são JSON com campo `type`. O servidor valida tudo com Zod.
Limite por mensagem: 8 KiB. Rate limit: 25 mensagens por 5 s por socket.

## Cliente → servidor

### `createRoom`

```json
{ "type": "createRoom", "name": "Ana" }
```

Cria sala, assento 1 e host.

### `joinRoom`

```json
{
  "type": "joinRoom",
  "code": "ABC12",
  "name": "Bruno",
  "token": "opcional",
  "spectate": false
}
```

- Com `token` válido: reconecta ao assento ou à espectação.
- Sem token e `spectate: false`: entra como jogador se a sala estiver no lobby e houver vaga.
- Com `spectate: true`: entra como espectador externo (não vê mãos).
- Se a partida já começou e o cliente não tem token, use `spectate: true`.

### Lobby (host)

```json
{ "type": "addBot" }
{ "type": "removeBot", "seat": 3 }
{ "type": "startGame" }
{ "type": "restart" }
```

`restart` volta ao lobby mantendo jogadores, após `gameOver`.

### Jogo

```json
{ "type": "bet", "value": 2 }
{ "type": "playCard", "cardId": "7_hearts" }
{ "type": "confirm" }
{ "type": "vote", "choice": "continue" }
{ "type": "leave" }
{ "type": "ping" }
```

`vote.choice`: `"continue"` ou `"wait"`.

## Servidor → cliente

### `welcome`

```json
{
  "type": "welcome",
  "playerId": "uuid",
  "token": "hex",
  "roomCode": "ABC12",
  "spectator": false,
  "serverNow": 1710000000000
}
```

O token deve ser guardado pelo cliente. Não é reenviado em snapshots.

### `state`

```json
{
  "type": "state",
  "seq": 42,
  "serverNow": 1710000000000,
  "room": {
    "code": "ABC12",
    "hostSeat": 1,
    "maxPlayers": 6,
    "status": "playing",
    "paused": false,
    "pause": null,
    "spectatorCount": 2
  },
  "players": [],
  "game": {
    "phase": "playing",
    "round": 2,
    "cardsThisRound": 2,
    "dealerSeat": 1,
    "turnSeat": 3,
    "table": [{ "seat": 3, "card": {}, "order": 0 }],
    "lastTrick": null,
    "lastRound": null,
    "winnerSeat": null,
    "deadline": 1710000035000
  },
  "you": {
    "playerId": "uuid",
    "seat": 3,
    "name": "Ana",
    "isHost": false,
    "isSpectator": false,
    "dead": false,
    "hand": [],
    "allHands": null,
    "canBet": false,
    "canPlay": true,
    "canConfirm": false,
    "canVote": false
  }
}
```

Campos relevantes:

- `seq`: monotônico; snapshots com `seq` menor devem ser ignorados.
- `serverNow`: para calcular offset do relógio local.
- `deadline`: timestamp absoluto do timer atual; `null` se pausado/sem timer.
- `players`: todos os assentos, inclusive mortos.
- `you.hand`: apenas a mão do próprio jogador.
- `you.allHands`: apenas para jogador morto (visão geral).
- `you.isSpectator`: espectador externo; `seat` é `null`; nunca recebe mãos.
- `room.pause`: presente durante votação.

### `error`

```json
{ "type": "error", "code": "NOT_YOUR_TURN", "message": "Não é o seu turno." }
```

Códigos usados:

| Código | Significado |
| --- | --- |
| `BAD_MESSAGE` | JSON/schema inválido |
| `BAD_NAME` | nome vazio/longo |
| `ROOM_NOT_FOUND` | código inexistente |
| `ROOM_FULL` | sem assento |
| `ROOM_LIMIT` | limite de salas do servidor |
| `GAME_STARTED` | partida em andamento; use espectador |
| `NOT_ENOUGH_PLAYERS` | menos de 2 jogadores |
| `PLAYERS_DISCONNECTED` | alguém desconectado no lobby |
| `NOT_HOST` | ação exclusiva do host |
| `NOT_IN_GAME` | ação de jogo fora de partida |
| `NOT_YOUR_TURN` | turno de outro jogador |
| `INVALID_BET` | aposta fora do intervalo ou proibida ao dealer |
| `CARD_NOT_IN_HAND` | carta inválida |
| `CANNOT_CONFIRM` | confirmação fora de hora |
| `CANNOT_VOTE` | votação indisponível |
| `TOKEN_INVALID` | token não pertence à sala |
| `RATE_LIMITED` | muitas mensagens |
| `ROOM_CLOSED` | sala encerrada |

### `pong`

```json
{ "type": "pong", "serverNow": 1710000000000 }
```

## Ciclo de vida

```
lobby ──startGame──► betting ──todas as apostas──► playing
playing ──todos jogaram──► trickEnd ──1,4 s──► playing
playing ──último fez──► roundEnd ──todos confirmam──► betting (nova rodada)
qualquer fase ──queda de vivo──► paused ──votação──► retomada
roundEnd ──último vivo──► gameOver ──restart (host)──► lobby
```

## Espectadores

- **Jogador morto**: recebe `allHands`; pode votar em pausas.
- **Espectador externo**: `seat: null`; recebe apenas mesa, jogadores, apostas, vidas, fez e resultados; não recebe `allHands`; não vota.
- Espectador externo pode entrar por link com a partida em andamento.
