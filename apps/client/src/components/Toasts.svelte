<script lang="ts">
  import { dismissToast, toasts } from '../lib/store';
</script>

<div class="toasts" aria-live="polite" aria-atomic="false">
  {#each $toasts as toast (toast.id)}
    <button
      type="button"
      class="toast {toast.kind}"
      on:click={() => dismissToast(toast.id)}
      aria-label="Fechar aviso"
    >
      {toast.text}
    </button>
  {/each}
</div>
