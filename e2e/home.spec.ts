import { expect, test } from '@playwright/test';

test('loads the capacity planning dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Calendário de alocação por projeto' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alocações' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dependências dos projetos' })).toBeVisible();
});

test('dashboard project and dependency links target the project detail', async ({ page }) => {
  await page.goto('/dashboard');
  const projectLink = page.locator('a.project-cell').first();
  if (await projectLink.count()) {
    await expect(projectLink).toHaveAttribute('href', /\/projects\/[^/]+/);
    await projectLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
    await page.goBack();
  }

  const dependencyLink = page.locator('a.dashboard-dependency').first();
  if (await dependencyLink.count()) {
    await expect(dependencyLink).toHaveAttribute('href', /\/projects\/[^/]+/);
  }
});

test('navigates to supporting domain screens', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projetos' })).toBeVisible();

  await page.goto('/developers');
  await expect(page.getByRole('heading', { name: 'Developers' })).toBeVisible();
  await expect(page.getByText('Skills e disponibilidade', { exact: true })).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText('Parceiros', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adicionar parceiro' })).toBeVisible();
});
