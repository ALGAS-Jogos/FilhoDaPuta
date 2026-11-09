<script lang="ts">
  import { gameState, leaveRoom, restartGame } from '../lib/store';

  function nameFor(seat: number | null): string {
    if (seat === null) {
      return 'Ninguém';
    }
    return $gameState?.players.find((player) => player.seat === seat)?.name ?? `Assento ${seat}`;
  }
</script>

{#if $gameState?.game?.phase === 'gameOver'}
  {@const game = $gameState.game}
  {@const you = $gameState.you}
  {@const winner = nameFor(game.winnerSeat)}
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
    <section class="modal panel">
      <span class="badge badge-gold">Partida encerrada</span>
      {#if game.winnerSeat === null}
        <h2 id="game-over-title" class="winner-title">Empate</h2>
        <p class="small muted">Todos os jogadores morreram na mesma rodada.</p>
      {:else}
        <h2 id="game-over-title" class="winner-title">
          {winner} venceu!
        </h2>
        <p class="small muted">
          {you.seat === game.winnerSeat ? 'Você foi o último de pé.' : 'Último jogador vivo da mesa.'}
        </p>
      {/if}

      <div class="result-list">
        {#each $gameState.players as player (player.seat)}
          <div class="result-row" class:self={player.seat === you.seat}>
            <span>{player.name}{player.isBot ? ' (bot)' : ''}</span>
            <span class="tiny muted">{player.dead ? 'eliminado' : 'vivo'}</span>
            <span class="lives">♥ {player.lives}</span>
          </div>
        {/each}
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" on:click={leaveRoom}>Sair da sala</button>
        {#if you.isHost}
          <button type="button" class="btn btn-primary" on:click={restartGame}>
            Jogar novamente
          </button>
        {:else}
          <span class="small muted">Aguardando o host iniciar outra partida.</span>
        {/if}
      </div>
    </section>
  </div>
{/if}
