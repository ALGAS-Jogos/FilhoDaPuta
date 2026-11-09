<script lang="ts">
  import { setTheme, themeId } from '../lib/store';
  import { THEMES, type ThemeId } from '../lib/render/theme';

  function change(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value as ThemeId;
    setTheme(value);
  }
</script>

<label class="sr-only" for="theme-select">Tema visual</label>
<select id="theme-select" class="theme-picker" value={$themeId} on:change={change}>
  {#each THEMES as theme (theme.id)}
    <option value={theme.id}>{theme.name}</option>
  {/each}
</select>
