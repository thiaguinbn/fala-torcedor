import test from 'node:test';
import assert from 'node:assert/strict';
import { api, formatCpf, formatDate, localToday, matchesSearch } from '../src/api.js';

test('formata CPF completo ou parcial sem perder zeros à esquerda', () => {
  assert.equal(formatCpf('01234567890'), '012.345.678-90');
  assert.equal(formatCpf('529.982.247-25'), '529.982.247-25');
  assert.equal(formatCpf('5299'), '529.9');
  assert.equal(formatCpf('5299822'), '529.982.2');
  assert.equal(formatCpf(''), '');
});

test('busca por nome ignora acentos e por CPF aceita pontuação parcial', () => {
  assert.equal(matchesSearch('João Gonçalves', ' JOAO '), true);
  assert.equal(matchesSearch('Grêmio', 'gremio'), true);
  assert.equal(matchesSearch('52998224725', '529.982', true), true);
  assert.equal(matchesSearch('52998224725', '529982', true), true);
  assert.equal(matchesSearch('52998224725', 'joao529', true), false);
  assert.equal(matchesSearch('52998224725', '.', true), false);
});

test('datas usam o calendário local e exibem dia, mês e ano', () => {
  assert.equal(localToday(new Date(2026, 0, 2, 23, 59)), '2026-01-02');
  assert.equal(formatDate('2000-02-29'), '29/02/2000');
});

test('API preserva a mensagem de validação e trata exclusão sem corpo', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ erro: 'Este CPF já está cadastrado.' }), { status: 409 }));
  await assert.rejects(api('/torcedores'), /Este CPF já está cadastrado/);
  globalThis.fetch.mock.mockImplementation(async () => new Response(null, { status: 204 }));
  assert.equal(await api('/torcedores/1', { method: 'DELETE' }), null);
});

test('API informa falhas de rede e respostas inesperadas', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(api('/equipes'), /Não foi possível conectar à API/);
  globalThis.fetch.mock.mockImplementation(async () => new Response('<html>Erro</html>', { status: 200 }));
  await assert.rejects(api('/equipes'), /Resposta inesperada/);
  globalThis.fetch.mock.mockImplementation(async () => new Response('Erro', { status: 500 }));
  await assert.rejects(api('/equipes'), /Não foi possível concluir a operação/);
});
