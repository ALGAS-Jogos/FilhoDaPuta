<script lang="ts">
  import { onMount } from 'svelte';
  import type { Card, StateMessage } from '@manilha/protocol';
  import GameOverPanel from './GameOverPanel.svelte';
  import PausePanel from './PausePanel.svelte';
  import RoundPanel from './RoundPanel.svelte';
  import ThemePicker from './ThemePicker.svelte';
  import { TableRenderer } from '../lib/render/renderer';
  import {
    confirmRound,
    gameState,
    leaveRoom,
    placeBet,
    playCard,
    serverOffset,
    themeId,
  } from '../lib/store';

  let canvas: HTMLCanvasElement | null = null;
  let renderer: TableRenderer | null = null;
  let selectedCardId: string | null = null;
  let betValue = 0;
  let betKey = '';
  let now = Date.now();

  const RANK_LABELS: Record<string, string> = {
    A: 'Ás',
    J: 'Valete',
    Q: 'Dama',
    K: 'Rei',
  };
  const SUIT_LABELS: Record<string, string> = {
    clubs: 'paus',
    diamonds: 'ouros',
    hearts: 'copas',
    spades: 'espadas',
  };

  function cardLabel(card: Card): string {
    return `${RANK_LABELS[card.rank] ?? card.rank} de ${SUIT_LABELS[card.suit] ?? card.suit}`;
  }

  function nameFor(seat: number | null | undefined, list = $gameState?.players ?? []): string {
    if (seat === null || seat === undefined) {
      return '';
    }
    return list.find((player) => player.seat === seat)?.name ?? `Assento ${seat}`;
  }

  function toggleCard(cardId: string): void {
    if (!$gameState?.you.hand.some((card) => card.id === cardId)) {
      return;
    }
    selectedCardId = selectedCardId === cardId ? null : cardId;
    renderer?.setSelected(selectedCardId);
  }

  function playSelected(): void {
    if (!$gameState?.you.canPlay || !selectedCardId) {
      return;
    }
    playCard(selectedCardId);
    selectedCardId = null;
    renderer?.setSelected(null);
  }

  function submitBet(): void {
    if (!$gameState?.you.canBet) {
      return;
    }
    placeBet(betValue);
  }

  function handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
      return;
    }
    const state = $gameState;
    if (!state) {
      return;
    }
    if (event.key === 'Escape') {
      selectedCardId = null;
      renderer?.setSelected(null);
      return;
    }
    if (state.you.canPlay && /^[1-9]$/.test(event.key)) {
      const card = state.you.hand[Number(event.key) - 1];
      if (card) {
        selectedCardId = card.id;
        renderer?.setSelected(selectedCardId);
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'Enter') {
      if (state.you.canPlay && selectedCardId) {
        playSelected();
        event.preventDefault();
      } else if (state.you.canConfirm) {
        confirmRound();
        event.preventDefault();
      }
    }
  }

  function buildAnnouncement(
    state: StateMessage | null,
    selected: Card | undefined,
  ): string {
    if (!state?.game) {
      return '';
    }
    if (state.room.paused) {
      return 'Partida pausada. Há uma votação em andamento.';
    }
    if (state.game.phase === 'gameOver') {
      const winner = nameFor(state.game.winnerSeat, state.players);
      return winner ? `${winner} venceu a partida.` : 'A partida terminou empatada.';
    }
    if (state.game.phase === 'roundEnd') {
      return 'Fim da rodada. Confirme o resultado para continuar.';
    }
    if (state.you.canPlay) {
      return selected
        ? `Sua vez. Carta selecionada: ${cardLabel(selected)}.`
        : 'Sua vez de jogar.';
    }
    if (state.you.canBet) {
      return 'Sua vez de apostar.';
    }
    const turn = nameFor(state.game.turnSeat, state.players);
    return turn ? `Vez de ${turn}.` : 'Aguardando…';
  }

  onMount(() => {
    if (!canvas) {
      return;
    }
    renderer = new TableRenderer(canvas);
    renderer.onCardClick = toggleCard;
    renderer.setTheme($themeId);
    if ($gameState) {
      renderer.setState($gameState);
    }
    renderer.mount();
    const interval = setInterval(() => {
      now = Date.now();
    }, 250);
    return () => {
      clearInterval(interval);
      renderer?.destroy();
      renderer = null;
    };
  });

  $: if ($gameState) {
    now = Date.now();
  }
  $: if (renderer && $gameState) {
    renderer.setState($gameState);
  }
  $: if (renderer) {
    renderer.setTheme($themeId);
  }
  $: if ($gameState && selectedCardId) {
    if (!$gameState.you.hand.some((card) => card.id === selectedCardId)) {
      selectedCardId = null;
      renderer?.setSelected(null);
    }
  }
  $: if ($gameState?.game) {
    const key = `${$gameState.room.code}-${$gameState.game.round}-${$gameState.game.phase}`;
    if (key !== betKey) {
      betKey = key;
      betValue = 0;
    }
  }

  $: room = $gameState?.room ?? null;
  $: game = $gameState?.game ?? null;
  $: you = $gameState?.you ?? null;
  $: players = $gameState?.players ?? [];
  $: self = you?.seat !== null ? players.find((player) => player.seat === you?.seat) : undefined;
  $: selectedCard = selectedCardId
    ? you?.hand.find((card) => card.id === selectedCardId)
    : undefined;
  $: cardsThisRound = game?.cardsThisRound ?? 1;
  $: dealer = you?.seat !== null && game?.dealerSeat === you?.seat;
  $: othersBet = players
    .filter((player) => player.seat !== you?.seat && !player.dead)
    .reduce((total, player) => total + (player.bet ?? 0), 0);
  $: betInvalid = dealer && othersBet + betValue === cardsThisRound;
  $: betOptions = Array.from({ length: Math.min(cardsThisRound, 7) + 1 }, (_, index) => index);
  $: timerTotal = game?.phase === 'roundEnd' ? 15_000 : 35_000;
  $: remainingMs = game?.deadline
    ? Math.max(0, game.deadline - (now + $serverOffset))
    : null;
  $: remainingSec =
    remainingMs === null
      ? null
      : Math.min(Math.ceil(timerTotal / 1000), Math.ceil(remainingMs / 1000));
  $: timerPct =
    remainingMs === null ? 100 : Math.max(0, Math.min(100, (remainingMs / timerTotal) * 100));
  $: bannerText = room?.paused
    ? 'Partida pausada'
    : game?.phase === 'gameOver'
      ? 'Fim de jogo'
      : game?.phase === 'roundEnd'
        ? 'Fim da rodada'
        : you?.canPlay
          ? 'Sua vez de jogar'
          : you?.canBet
            ? 'Sua vez de apostar'
            : game?.turnSeat !== null
              ? `Vez de ${nameFor(game?.turnSeat, players)}`
              : 'Aguardando…';
  $: announcement = buildAnnouncement($gameState, selectedCard);
  $: turnName = nameFor(game?.turnSeat, players);
</script>

<svelte:window on:keydown={handleKey} />

<div class="table-screen">
  <div class="canvas-wrap">
    <canvas bind:this={canvas} aria-hidden="true"></canvas>
  </div>

  <div class="table-ui">
    <header class="topbar">
      {#if room}
        <span class="pill code">{room.code}</span>
      {/if}
      {#if game}
        <span class="pill hide-mobile">
          Rodada {game.round} · {game.cardsThisRound} carta{game.cardsThisRound === 1 ? '' : 's'}
        </span>
      {/if}
      {#if self}
        <span class="pill lives">{self.lives > 0 ? '♥' : '♡'} {self.lives}</span>
      {/if}
      {#if you?.isSpectator}
        <span class="badge badge-muted">espectador</span>
      {:else if you?.dead}
        <span class="badge badge-danger">eliminado</span>
      {/if}
      <span class="spacer"></span>
      <ThemePicker />
      <button type="button" class="btn btn-small btn-ghost" on:click={leaveRoom}>Sair</button>
    </header>

    {#if game}
      <div class="turn-banner" aria-live="polite">
        <span>{bannerText}</span>
        {#if remainingSec !== null}
          <span class="timer-track" aria-hidden="true">
            <span
              class="timer-fill"
              class:low={remainingSec <= 10}
              style={`width: ${timerPct}%`}
            ></span>
          </span>
          <strong>{remainingSec}s</strong>
        {/if}
      </div>
    {/if}

    {#if game && !room?.paused}
      {#if game.phase === 'betting' && you?.canBet}
        <div class="bottom-controls">
          <div class="control-label">
            <strong>Aposta</strong>
            <span>
              Total {othersBet + betValue}{dealer ? ` · limite ${cardsThisRound}` : ''}
            </span>
          </div>
          <div class="chip-row" role="group" aria-label="Valor da aposta">
            {#each betOptions as value (value)}
              <button
                type="button"
                class="chip"
                class:active={betValue === value}
                disabled={dealer && othersBet + value === cardsThisRound}
                on:click={() => (betValue = value)}
              >
                {value}
              </button>
            {/each}
          </div>
          {#if betInvalid}
            <span class="tiny" style="color: var(--danger)">Soma não pode ser {cardsThisRound}</span>
          {/if}
          <button type="button" class="btn btn-primary" disabled={betInvalid} on:click={submitBet}>
            Apostar {betValue}
          </button>
        </div>
      {:else if game.phase === 'playing' && you?.canPlay}
        <div class="bottom-controls">
          <div class="selected-card">
            <strong>{selectedCard ? cardLabel(selectedCard) : 'Selecione uma carta'}</strong>
            <span>{you.hand.length} na mão · toque na carta ou use 1–7</span>
          </div>
          <button
            type="button"
            class="btn btn-primary"
            disabled={!selectedCard}
            on:click={playSelected}
          >
            Jogar carta
          </button>
        </div>
      {:else if you?.dead}
        <div class="bottom-controls">
          <span class="badge badge-danger">eliminado</span>
          <span class="small muted">Você vê todas as mãos. Assista até o fim.</span>
        </div>
      {:else if you?.isSpectator}
        <div class="bottom-controls">
          <span class="badge badge-muted">assistindo</span>
          <span class="small muted">Visão pública: as mãos ficam ocultas.</span>
        </div>
      {:else if game.phase !== 'roundEnd' && game.phase !== 'gameOver'}
        <div class="bottom-controls">
          <div class="control-label">
            <strong>{turnName ? `Vez de ${turnName}` : 'Aguardando'}</strong>
            <span>{game.phase === 'trickEnd' ? 'Resolvendo a vaza…' : 'Aguarde sua vez.'}</span>
          </div>
        </div>
      {/if}
    {/if}

    {#if you && !you.isSpectator}
      <div class="hand-a11y">
        <p>Sua mão, em ordem:</p>
        <ul>
          {#each you.hand as card, index (card.id)}
            <li>
              <button type="button" on:click={() => toggleCard(card.id)}>
                {index + 1}. {cardLabel(card)}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="sr-only" aria-live="polite">{announcement}</div>
  </div>
</div>

<PausePanel />
<RoundPanel remainingSec={remainingSec} />
<GameOverPanel />
