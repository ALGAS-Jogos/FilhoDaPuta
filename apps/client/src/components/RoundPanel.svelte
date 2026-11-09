<script lang="ts">
  import { confirmRound, gameState } from '../lib/store';

  export let remainingSec: number | null = null;

  function nameFor(seat: number): string {
    return $gameState?.players.find((player) => player.seat === seat)?.name ?? `Assento ${seat}`;
  }
</script>

{#if $gameState?.game?.phase === 'roundEnd'}
  {@const you = $gameState.you}
  {@const lastRound = $gameState.game.lastRound}
  <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="round-title">
    <section class="modal panel">
      <div class="row">
        <div>
          <span class="badge">Fim da rodada {$gameState.game.round}</span>
          <h2 id="round-title">Resultado</h2>
        </div>
        <span class="spacer"></span>
        {#if remainingSec !== null}
          <span class="badge badge-muted badge-timer">{remainingSec} s para confirmar</span>
        {/if}
      </div>

      {#if lastRound}
        <div class="result-list">
          {#each lastRound.results as result (result.seat)}
            <div class="result-row" class:self={result.seat === you.seat}>
              <span>{nameFor(result.seat)}</span>
              <span class="tiny muted">aposta {result.bet}</span>
              <span class="tiny muted">{result.tricks} vaza{result.tricks === 1 ? '' : 's'}</span>
              <span class:lost={result.lostLife} class:kept={!result.lostLife}>
                {result.lostLife ? '−1 vida' : 'manteve'}
              </span>
              <span class="lives-after lives">♥ {result.lives}</span>
            </div>
          {/each}
        </div>
      {/if}

      <p class="tiny muted">
        A próxima rodada começa quando todos os jogadores vivos confirmarem. Jogadores mortos não
        confirmam.
      </p>

      <div class="modal-actions">
        {#if you.canConfirm}
          <button type="button" class="btn btn-primary" on:click={confirmRound}>
            Confirmar e continuar
          </button>
        {:else if you.dead}
          <span class="small muted">Você está eliminado. Aguardando o fim da partida.</span>
        {:else}
          <span class="small muted">Aguardando os outros jogadores…</span>
        {/if}
      </div>
    </section>
  </div>
{/if}
