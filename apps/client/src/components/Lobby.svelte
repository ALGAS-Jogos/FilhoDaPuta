<script lang="ts">
  import ThemePicker from './ThemePicker.svelte';
  import {
    addBot,
    gameState,
    inviteUrl,
    leaveRoom,
    pushToast,
    removeBot,
    startGame,
  } from '../lib/store';

  let copied: 'code' | 'link' | null = null;

  async function copy(value: string, kind: 'code' | 'link'): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      copied = kind;
      setTimeout(() => {
        copied = null;
      }, 1800);
    } catch {
      pushToast('error', 'Não foi possível copiar. Selecione o texto manualmente.');
    }
  }
</script>

{#if $gameState}
  {@const room = $gameState.room}
  {@const players = $gameState.players}
  {@const you = $gameState.you}
  {@const invite = inviteUrl(room.code)}
  {@const canStart = players.length >= 2 && players.every((player) => player.connected)}
  <main class="lobby">
    <header class="lobby-head">
      <div>
        <span class="badge">Sala de espera</span>
        <div class="code-display">
          <strong>{room.code}</strong>
          <button
            type="button"
            class="btn btn-small btn-ghost"
            on:click={() => copy(room.code, 'code')}
          >
            {copied === 'code' ? 'Copiado!' : 'Copiar código'}
          </button>
        </div>
        <p class="small muted">
          {players.length} de {room.maxPlayers} jogadores
          {#if room.spectatorCount > 0}
            · {room.spectatorCount} espectador{room.spectatorCount === 1 ? '' : 'es'}
          {/if}
        </p>
      </div>
      <div class="row">
        <ThemePicker />
        <button type="button" class="btn btn-small btn-danger" on:click={leaveRoom}>Sair</button>
      </div>
    </header>

    <section class="panel" style="padding: 1rem; display: grid; gap: 0.8rem;">
      <div class="row">
        <span class="badge badge-muted">Link de convite</span>
        <span class="small muted">Quem abrir com a partida em andamento entra como espectador.</span>
      </div>
      <div class="invite">
        <code>{invite}</code>
        <button type="button" class="btn btn-small" on:click={() => copy(invite, 'link')}>
          {copied === 'link' ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>
    </section>

    <section class="player-grid" aria-label="Jogadores da sala">
      {#each players as player (player.seat)}
        <article
          class="player-card"
          class:self={player.seat === you.seat}
          class:offline={!player.connected}
        >
          <div class="row">
            <span class="player-name">{player.name}</span>
            {#if player.seat === room.hostSeat}
              <span class="badge badge-gold">host</span>
            {/if}
            {#if player.isBot}
              <span class="badge badge-muted">bot</span>
            {/if}
            {#if player.seat === you.seat}
              <span class="badge">você</span>
            {/if}
          </div>
          <span class="tiny muted">
            Assento {player.seat} · {player.isBot
              ? 'bot'
              : player.connected
                ? 'conectado'
                : 'offline'}
          </span>
          {#if you.isHost && player.isBot}
            <button
              type="button"
              class="btn btn-small btn-ghost"
              on:click={() => removeBot(player.seat)}
            >
              Remover bot
            </button>
          {/if}
        </article>
      {/each}

      {#if you.isHost && players.length < room.maxPlayers}
        <button type="button" class="player-card" on:click={addBot}>
          <span class="player-name">+ Adicionar bot</span>
          <span class="tiny muted">O bot aposta e joga sozinho.</span>
        </button>
      {/if}
    </section>

    <footer class="lobby-foot">
      <div class="row">
        {#if you.isSpectator}
          <span class="badge badge-muted">assistindo</span>
          <span class="small muted">Você verá a mesa, mas não as mãos.</span>
        {:else if you.isHost}
          <button
            type="button"
            class="btn btn-primary"
            disabled={!canStart}
            on:click={startGame}
          >
            Iniciar partida
          </button>
          {#if players.length < 2}
            <span class="small muted">Adicione alguém ou um bot para começar.</span>
          {:else if !canStart}
            <span class="small muted">Aguarde todos os assentos conectarem.</span>
          {/if}
        {:else}
          <span class="small muted">Aguardando o host iniciar a partida…</span>
        {/if}
      </div>
      <span class="small muted">Máximo de 6 assentos. A sala vive só na memória do servidor.</span>
    </footer>
  </main>
{/if}
