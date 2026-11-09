import { expect, type Page, test } from '@playwright/test';

async function openHome(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.fill('#player-name', name);
}

async function createRoom(page: Page, name: string): Promise<string> {
  await openHome(page, name);
  await page.getByRole('button', { name: 'Criar sala' }).click();
  await expect(page.getByText('Sala de espera')).toBeVisible();
  await expect(page).toHaveURL(/\/sala\/[A-Z0-9]{5}$/);
  const match = page.url().match(/\/sala\/([A-Z0-9]{5})$/);
  if (!match?.[1]) {
    throw new Error('código da sala não encontrado');
  }
  return match[1];
}

test('cria sala, adiciona bots, joga uma rodada e confirma', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const code = await createRoom(page, 'Ana');
  expect(code).toHaveLength(5);

  await page.getByRole('button', { name: /Adicionar bot/ }).click();
  await page.getByRole('button', { name: /Adicionar bot/ }).click();
  await page.getByRole('button', { name: 'Iniciar partida' }).click();

  await expect(page.locator('canvas')).toBeVisible();
  const bet = page.locator('.bottom-controls').getByRole('button', { name: /^Apostar/ });
  await expect(bet).toBeVisible();
  await bet.click();

  const play = page.getByRole('button', { name: 'Jogar carta' });
  await expect(play).toBeVisible();
  await page.keyboard.press('1');
  await expect(play).toBeEnabled();
  await play.click();

  await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('link da sala entra como espectador sem ver as mãos', async ({ page, browser }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const code = await createRoom(page, 'Ana');
  await page.getByRole('button', { name: /Adicionar bot/ }).click();
  await page.getByRole('button', { name: /Adicionar bot/ }).click();
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.locator('canvas')).toBeVisible();

  const spectatorContext = await browser.newContext({
    viewport: { width: 1100, height: 800 },
  });
  const spectator = await spectatorContext.newPage();
  spectator.on('pageerror', (error) => errors.push(`espectador: ${error.message}`));
  await spectator.goto(`/sala/${code}`);
  await expect(spectator.locator('#room-code')).toHaveValue(code);
  await spectator.fill('#player-name', 'Olho');
  await spectator.getByRole('button', { name: 'Só assistir' }).click();

  await expect(spectator.getByText('assistindo').first()).toBeVisible();
  await expect(spectator.getByText('Modo espectador: mãos ocultas.')).toBeVisible();
  await expect(spectator.locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);

  await spectatorContext.close();
});
