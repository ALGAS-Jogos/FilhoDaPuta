# Arquitetura

## Visão geral

```
Navegador
  Svelte 5 (menus, HUD, modais)
  Canvas 2D (mesa e cartas procedurais)
        │
        │ WebSocket JSON
        ▼
Node.js 22
  Fastify (HTTP, estático, /healthz)
  @fastify/websocket (/ws)
  RoomManager
    Room
      timers, pausa/votação, bots, reconexão
      projeção por jogador
  Engine pura (packages/engine)
      regras, RNG semeável, máquina de estados
```

## Princípios

1. **O servidor é a única fonte de verdade.** O cliente não calcula fez, vidas, apostas nem vencedores.
2. **Projeção por audiência.** Cada jogador recebe apenas a própria mão. Jogador morto recebe todas as mãos. Espectador externo recebe apenas dados públicos.
3. **Snapshots sequenciais.** Cada alteração gera um `state` com `seq`. O cliente ignora snapshots antigos e reconecta pedindo o estado atual.
4. **Engine pura.** `packages/engine` não conhece rede, tempo, DOM nem HTTP. Recebe RNG e devolve estado/eventos. Isso permite testes determinísticos.
5. **Sem predição.** O cliente anima depois da confirmação do servidor. A latência de uma LAN/VPS é irrelevante para este jogo.
6. **Tempo real só na renderização.** O servidor é orientado a eventos; o cliente roda `requestAnimationFrame` a 60 fps.
7. **Sem sprites de carta.** Todas as faces, verso, mesa e sombras são desenhados por código. Cache em `OffscreenCanvas` é apenas rasterização em runtime.

## Componentes

### `packages/engine`

- `cards.ts`: baralho, naipes, ranks, manilhas.
- `rng.ts`: `mulberry32` semeável e Fisher–Yates.
- `game.ts`: máquina de estados, apostas, fez, rodadas, vidas, morte, fim.
- `invariants.ts`: conservação de cartas e consistência.
- Testes com partidas completas semeadas para 2–6 jogadores.

### `packages/protocol`

- Schemas Zod de comandos e snapshots.
- Tipos inferidos usados pelo servidor e pelo cliente.
- Validação de tamanho e formato de todas as mensagens.

### `apps/server`

- `config.ts`: variáveis de ambiente.
- `room.ts`: sala, assentos, host, bots, pausa/votação, timers.
- `rooms.ts`: criação, busca, TTL e código.
- `project.ts`: snapshots por jogador/espectador.
- `ws.ts`: handshake, token, rate limit, heartbeat.
- `app.ts`: Fastify, estático, healthcheck, SPA fallback.
- `index.ts`: bootstrap e shutdown gracioso.

### `apps/client`

- `lib/net.ts`: WebSocket, reconexão com backoff, token, RTT.
- `lib/store.ts`: estado recebido, sessão, tema, erros.
- `lib/render/`: layout, `CardArt`, cache, animações, input.
- `components/`: Home, Lobby, Table, PausePanel, RoundResult, GameOver.
- UI em pt-BR; strings centralizadas em `lib/strings.ts`.

## Fluxo de uma ação

1. Cliente envia comando (`bet`, `playCard`, `confirm`, `vote`).
2. Servidor valida com Zod e com a engine.
3. Engine aplica a regra e devolve o novo estado interno.
4. Sala recalcula timers e projeções.
5. Cada socket recebe um `state` personalizado com `seq`.
6. Cliente aplica o snapshot e o renderer anima a diferença.

## Pausa e votação

- A sala guarda `deadline` e o restante do timer.
- Queda de jogador vivo pausa, congela o timer e abre votação.
- Maioria simples entre humanos conectados com assento decide.
- “Continuar” transforma os assentos desconectados em bots até a reconexão.
- “Esperar” mantém a sala pausada; reconexão de todos retoma automaticamente.

## Reconexão

- Token aleatório de 32 bytes entregue no `welcome`.
- Cliente guarda `{code, token}` em `localStorage`.
- Ao abrir/reabrir, envia `joinRoom` com token.
- O servidor reata o assento, cancela bot e reenvia o snapshot.
- Sala em memória: restart do servidor invalida tokens.

## Segurança

- Limite de mensagem (`maxPayload`) e rate limit por socket.
- Nome sanitizado (controle removido, 1–16 caracteres).
- Origem permitida configurável; sem `eval`.
- Nenhum segredo de baralho sai do servidor.
- Rate limit de criação de sala por IP.
- Tokens não aparecem em logs.
- App escuta em loopback no deploy; TLS/WSS no reverse proxy.

## Decisões

- **Svelte 5** para UI declarativa sem carregar runtime pesado; Canvas fica imperativo.
- **Fastify + @fastify/websocket** por tipagem, plugins e baixo overhead.
- **Zod** compartilhado para não duplicar contratos.
- **Sem banco**: estado em memória, conforme decidido.
- **Sem CI**: verificação local com `npm run verify` e `npm run e2e`.
