<script lang="ts">
  import { gameState } from '../lib/store';
</script>

{#if $gameState?.game}
  {@const game = $gameState.game}
  {@const you = $gameState.you}
  <div class="scorebar" aria-label="Apostas e fez de cada jogador">
    {#each $gameState.players as player (player.seat)}
      <div
        class="score-chip"
        class:turn={game.turnSeat === player.seat && !$gameState.room.paused}
        class:self={you.seat === player.seat}
        class:dead={player.dead}
      >
        <span class="score-name">{player.name}</span>
        {#if game.dealerSeat === player.seat}
          <span class="score-dealer" title="Dealer">D</span>
        {/if}
        <span>aposta <b>{player.bet ?? '—'}</b></span>
        <span>fez <b>{player.tricksWon}</b></span>
        <span class="score-lives">♥{player.lives}</span>
      </div>
    {/each}
  </div>
{/if}
