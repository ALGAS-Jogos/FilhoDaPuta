<script lang="ts">
  import { gameState, vote } from '../lib/store';

  function nameFor(seat: number): string {
    return $gameState?.players.find((player) => player.seat === seat)?.name ?? `Assento ${seat}`;
  }

  function choiceFor(seat: number): string {
    const choice = $gameState?.room.pause?.votes.find((entry) => entry.seat === seat)?.choice;
    return choice === 'continue' ? 'continuar' : choice === 'wait' ? 'esperar' : 'não votou';
  }
</script>

{#if $gameState}
  {@const room = $gameState.room}
  {#if room.paused && room.pause}
    {@const pause = room.pause}
    {@const you = $gameState.you}
    {@const continueVotes = pause.votes.filter((entry) => entry.choice === 'continue').length}
    {@const waitVotes = pause.votes.filter((entry) => entry.choice === 'wait').length}
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <section class="modal panel">
        <div>
          <span class="badge badge-gold">Partida pausada</span>
          <h2 id="pause-title">Um jogador caiu</h2>
        </div>

        <p class="small muted">Continuar com um bot ou esperar a reconexão?</p>

        <div class="pause-note">
          Desconectado{pause.disconnectedSeats.length === 1 ? '' : 's'}:
          <strong>
            {pause.disconnectedSeats.map((seat) => nameFor(seat)).join(', ')}
          </strong>
        </div>

        <div class="vote-list">
          {#each pause.eligibleSeats as seat (seat)}
            <div class="vote-row">
              <span>{nameFor(seat)}{seat === you.seat ? ' (você)' : ''}</span>
              <strong>{choiceFor(seat)}</strong>
            </div>
          {/each}
          {#if pause.eligibleSeats.length === 0}
            <span class="small muted">Nenhum humano conectado pode votar agora.</span>
          {/if}
        </div>

        <p class="tiny muted">
          Maioria: {pause.majority} de {pause.eligibleSeats.length} · continuar {continueVotes} ·
          esperar {waitVotes}
        </p>

        {#if you.canVote}
          <div class="modal-actions">
            <button type="button" class="btn" on:click={() => vote('wait')}>
              Esperar reconexão
            </button>
            <button type="button" class="btn btn-primary" on:click={() => vote('continue')}>
              Continuar com bot
            </button>
          </div>
        {:else}
          <p class="small muted">Aguardando a votação dos jogadores conectados…</p>
        {/if}
      </section>
    </div>
  {/if}
{/if}
