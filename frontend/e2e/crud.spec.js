import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function checkAccessibility(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
}

// Cada teste remove somente os registros que ele próprio criou.
const test = base.extend({
  records: async ({ request }, use) => {
    const records = { teams: [], fans: [] };
    await use(records);
    for (const [entity, ids] of [['torcedores', records.fans], ['equipes', records.teams]]) {
      for (const id of ids) {
        const response = await request.delete(`/api/${entity}/${id}`);
        expect([204, 404]).toContain(response.status());
      }
    }
  }
});

function testCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (let length = 9; length <= 10; length++) {
    const sum = digits.reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    digits.push(remainder === 10 ? 0 : remainder);
  }
  return digits.join('');
}

async function selectPage(page, name) {
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

async function createTeam(page, records, name) {
  await page.getByRole('button', { name: 'Nova equipe', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da equipe').fill(name);
  await dialog.getByLabel('Data de fundação').fill('1950-05-10');
  await dialog.getByRole('combobox', { name: 'Série', exact: true }).selectOption('B');
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/equipes') && response.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'Cadastrar equipe', exact: true }).click()
  ]);
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  records.teams.push(id);
  await expect(dialog).not.toBeVisible();
  return id;
}

test('CRUD completo: equipes, torcedores, consulta, busca, transferência e exclusão', async ({ page, records }) => {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const teamName = `Grêmio UI ${token}`;
  const otherTeam = `Clube UI ${token}`;
  const fanName = `João UI ${token}`;
  const cpf = testCpf();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('img', { name: /G4Flex/ })).toBeVisible();
  await selectPage(page, 'Equipes');
  const firstId = await createTeam(page, records, teamName);
  const secondId = await createTeam(page, records, otherTeam);
  await checkAccessibility(page);

  await page.getByRole('button', { name: teamName, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('10/05/1950', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Editar cadastro' }).click();
  await dialog.getByRole('combobox', { name: 'Série', exact: true }).selectOption('A');
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Buscar equipe').fill(`gremio ui ${token}`);
  await expect(page.getByRole('button', { name: teamName, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: otherTeam, exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Série', exact: true }).selectOption('B');
  await expect(page.getByText('Nenhum resultado encontrado')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).first().click();

  // Duplicidade mantém os dados preenchidos e mostra a mensagem da API.
  await page.getByRole('button', { name: 'Nova equipe', exact: true }).click();
  await dialog.getByLabel('Nome da equipe').fill(teamName.toLowerCase());
  await dialog.getByLabel('Data de fundação').fill('1950-05-10');
  await dialog.getByRole('button', { name: 'Cadastrar equipe', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Já existe uma equipe com esse nome.');
  await expect(dialog.getByLabel('Nome da equipe')).toHaveValue(teamName.toLowerCase());
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Descartar alterações', exact: true }).click();

  await selectPage(page, 'Torcedores');
  await page.getByRole('button', { name: 'Novo torcedor', exact: true }).click();
  await dialog.getByLabel('Nome completo').fill(fanName);
  await dialog.getByLabel('CPF', { exact: true }).fill('11111111111');
  await dialog.getByLabel('Data de nascimento').fill('2000-02-29');
  await dialog.getByRole('combobox', { name: 'Equipe', exact: true }).selectOption(String(firstId));
  await dialog.getByRole('button', { name: 'Cadastrar torcedor', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Informe um CPF válido.');
  await dialog.getByLabel('CPF', { exact: true }).fill(cpf);
  const [created] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/torcedores') && response.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'Cadastrar torcedor', exact: true }).click()
  ]);
  expect(created.status()).toBe(201);
  const { id: fanId } = await created.json();
  records.fans.push(fanId);
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Buscar torcedor').fill(`joao ui ${token}`);
  await expect(page.getByRole('button', { name: fanName, exact: true })).toBeVisible();
  await page.getByLabel('Buscar torcedor').fill(`${cpf.slice(0, 3)}.${cpf.slice(3, 6)}`);
  await expect(page.getByRole('button', { name: fanName, exact: true })).toBeVisible();
  await page.getByRole('button', { name: fanName, exact: true }).click();
  await expect(dialog.getByText('29/02/2000', { exact: true })).toBeVisible();
  await expect(dialog.getByText(teamName, { exact: true })).toBeVisible();
  await checkAccessibility(page);
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();

  await selectPage(page, 'Equipes');
  await page.getByRole('button', { name: `Excluir ${teamName}`, exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Equipe com torcedores' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirmar exclusão' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Ver torcedores', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Equipe', exact: true })).toHaveValue(String(firstId));
  await page.getByRole('button', { name: `Editar ${fanName}`, exact: true }).click();
  await expect(dialog.getByLabel('CPF', { exact: true })).toHaveValue(cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
  await dialog.getByRole('combobox', { name: 'Equipe', exact: true }).selectOption(String(secondId));
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: fanName, exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Equipe', exact: true }).selectOption(String(secondId));
  await expect(page.getByRole('button', { name: fanName, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Excluir ${fanName}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('button', { name: fanName, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Excluir ${fanName}`, exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: fanName, exact: true })).toHaveCount(0);

  await selectPage(page, 'Equipes');
  for (const name of [teamName, otherTeam]) {
    await page.getByRole('button', { name: `Excluir ${name}`, exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('preserva alterações ao cancelar saída e mantém o layout dentro da tela', async ({ page }) => {
  await page.goto('/');
  await selectPage(page, 'Equipes');
  await page.getByRole('button', { name: 'Nova equipe', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da equipe').fill('Alteração não salva');
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('heading', { name: 'Descartar alterações?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(dialog.getByLabel('Nome da equipe')).toHaveValue('Alteração não salva');
  await expect(dialog.getByLabel('Nome da equipe')).toBeFocused();
  await checkAccessibility(page);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Descartar alterações', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('mostra falha no carregamento e permite tentar novamente', async ({ page }) => {
  await page.route('**/api/equipes', route => route.fulfill({ status: 503, json: { erro: 'Banco indisponível para teste.' } }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Banco indisponível para teste.');
  await expect(page.getByRole('button', { name: /Novo torcedor|Cadastrar primeira equipe/ })).toBeDisabled();
  await page.unroute('**/api/equipes');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /G4Flex/ })).toBeVisible();
});

test('orienta o primeiro cadastro e abre diretamente o formulário de equipe', async ({ page }) => {
  await page.route('**/api/equipes', route => route.fulfill({ json: [] }));
  await page.route('**/api/torcedores', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.getByText('Nenhum torcedor cadastrado', { exact: true })).toBeVisible();
  await checkAccessibility(page);
  await page.getByRole('button', { name: 'Cadastrar primeira equipe', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Nova equipe', exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Nome da equipe')).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
