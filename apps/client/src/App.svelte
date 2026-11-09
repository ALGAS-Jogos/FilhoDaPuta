<script lang="ts">
  import { onMount } from 'svelte';
  import Home from './components/Home.svelte';
  import Lobby from './components/Lobby.svelte';
  import Table from './components/Table.svelte';
  import Toasts from './components/Toasts.svelte';
  import { gameState, initClient } from './lib/store';

  onMount(() => {
    initClient();
  });
</script>

<div class="app-shell">
  {#if !$gameState}
    <Home />
  {:else if !$gameState.game}
    <Lobby />
  {:else}
    <Table />
  {/if}
  <Toasts />
</div>
