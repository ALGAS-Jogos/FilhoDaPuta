<script lang="ts">
  import { onMount } from 'svelte';
  import ThemePicker from './ThemePicker.svelte';
  import {
    codeFromPath,
    connection,
    createRoom,
    joinRoom,
    myName,
    session,
    setMyName,
  } from '../lib/store';

  let name = $myName;
  let code = codeFromPath() ?? '';
  let nameInput: HTMLInputElement | null = null;

  onMount(() => {
    if (!name) {
      nameInput?.focus();
    }
  });

  function normalizeCode(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value;
    code = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5);
  }

  function normalizeName(event: Event): void {
    const value = (event.currentTarget as HTMLInputElement).value;
    name = value.slice(0, 16);
    setMyName(name);
  }

  function submit(): void {
    if (!name.trim()) {
      nameInput?.focus();
      return;
    }
    if (code.length === 5) {
      joinRoom(code, name);
    } else {
      createRoom(name);
    }
  }

  function spectate(): void {
    if (code.length === 5) {
      joinRoom(code, name || 'Espectador', true);
    }
  }

  const statusLabel = (status: string): string => {
    if (status === 'online') {
      return 'Conectado';
    }
    if (status === 'connecting') {
      return 'Conectando…';
    }
    return 'Servidor offline';
  };
</script>

<main class="home">
  <section class="home-card panel">
    <div class="brand">
      <div>
        <div class="suit-line" aria-hidden="true">
          <span>♣</span><span class="red">♦</span><span class="red">♥</span><span>♠</span>
        </div>
        <h1>Manilha</h1>
        <p>Jogo de cartas pra jogar com os amigos. De 2 a 6 jogadores.</p>
      </div>
      <div class="brand-mark" aria-hidden="true">M</div>
    </div>

    {#if $session && $connection !== 'online'}
      <div class="pause-note">
        Reconectando à sala <strong>{$session.code}</strong>…
        {#if $connection === 'offline'}
          <span class="small muted"> Tentando novamente.</span>
        {/if}
      </div>
    {/if}

    <div class="field">
      <label for="player-name">Seu apelido</label>
      <input
        id="player-name"
        class="input"
        bind:this={nameInput}
        value={name}
        maxlength="16"
        autocomplete="nickname"
        placeholder="Ex.: Ana"
        on:input={normalizeName}
        on:keydown={(event) => {
          if (event.key === 'Enter') submit();
        }}
      />
    </div>

    <div class="field">
      <label for="room-code">Código da sala</label>
      <div class="code-row">
        <input
          id="room-code"
          class="input"
          value={code}
          maxlength="5"
          inputmode="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="ABC12"
          on:input={normalizeCode}
          on:keydown={(event) => {
            if (event.key === 'Enter') submit();
          }}
        />
        <button
          type="button"
          class="btn btn-primary"
          disabled={code.length !== 5 || !name.trim()}
          on:click={() => joinRoom(code, name)}
        >
          Entrar
        </button>
      </div>
    </div>

    <div class="home-actions">
      <button type="button" class="btn" disabled={!name.trim()} on:click={() => createRoom(name)}>
        Criar sala
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        disabled={code.length !== 5}
        on:click={spectate}
      >
        Só assistir
      </button>
    </div>

    <div class="home-foot">
      <span class="row small muted">
        <span class="status-dot {$connection}" aria-hidden="true"></span>
        {statusLabel($connection)}
      </span>
      <ThemePicker />
    </div>
  </section>
</main>
