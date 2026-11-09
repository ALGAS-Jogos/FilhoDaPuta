# Manilha

Jogo de cartas multiplayer (2 a 6 jogadores) com:

- **servidor autoritativo** em Node.js/TypeScript;
- **cliente web** em Svelte 5 + Canvas 2D;
- **cartas desenhadas em tempo real**, sem PNG/SVG de carta, sem sprites;
- salas por código, bots, reconexão e espectadores.

## Regras

As regras completas estão em [docs/RULES.md](docs/RULES.md).

## Requisitos

- Node.js 22.12+
- npm 10+

## Desenvolvimento

```bash
npm install
npm run dev:server   # API + WebSocket em http://localhost:3000
npm run dev:client   # Vite em http://localhost:5173 (proxy /ws para 3000)
```

Abra `http://localhost:5173`.

## Scripts

```bash
npm run typecheck  # TypeScript + svelte-check
npm run test       # testes do engine, cliente e servidor
npm run lint       # Biome
npm run format     # Biome com escrita
npm run verify     # lint + typecheck + testes
npm run build      # cliente Vite + servidor
npm start          # build + servidor em http://localhost:3000
npm run serve      # alias para npm start
npm run start:server # só o servidor, usando a build existente
npm run e2e        # Playwright local
```

Em produção o próprio servidor Fastify serve `apps/client/dist` e faz fallback de SPA para
`/sala/CODIGO`. Em desenvolvimento, use `dev:client` para o Vite com hot reload.

Não há GitHub Actions. A verificação é local.

## Estrutura

```
apps/client       Svelte 5 + Canvas 2D
apps/server       Fastify + WebSocket + salas/timers
packages/engine   regras puras, RNG semeável, máquina de estados
packages/protocol schemas Zod e tipos do protocolo
docs              regras, arquitetura, protocolo e deploy
```

## Deploy

Veja [docs/DEPLOY.md](docs/DEPLOY.md). O alvo é um subdomínio com Docker Compose atrás de um reverse proxy HTTP existente.

## Licença

GPL-3.0-or-later. Veja [LICENSE](LICENSE).
