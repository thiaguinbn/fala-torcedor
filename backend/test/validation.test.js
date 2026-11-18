import test from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido, parseId, validate } from '../src/validation.js';

test('CPF: aceita dígitos válidos e rejeita repetição ou dígito incorreto', () => {
  assert.equal(cpfValido('52998224725'), true);
  for (const cpf of ['11111111111', '52998224726', '123', 'abcdefghijk']) assert.equal(cpfValido(cpf), false);
});
test('normaliza CPF e nome antes de persistir', () => {
  assert.deepEqual(validate({ nome: '  Torcedor Teste  ', cpf: '529.982.247-25', data_nascimento: '2000-01-01', equipe_id: '1' }, 'torcedor'), ['Torcedor Teste', '52998224725', '2000-01-01', 1]);
});
test('rejeita datas inexistentes, futuras e séries desconhecidas', () => {
  const equipe = { nome: 'Clube Teste', data_fundacao: '2000-01-01', serie: 'A' };
  for (const value of ['2025-02-29', '2026-02-30', '9999-01-01', 'ontem', null]) assert.throws(() => validate({ ...equipe, data_fundacao: value }, 'equipe'));
  assert.throws(() => validate({ ...equipe, serie: 'Z' }, 'equipe'));
});
test('rejeita IDs inválidos e nomes fora do limite', () => {
  for (const value of [0, -1, '1abc', '1.1', '9999999999999', [1], ['1'], {}, true, null, undefined]) {
    assert.throws(() => parseId(value), { status: 400 });
  }
  assert.equal(parseId('2147483647'), 2147483647);
  assert.equal(parseId(1), 1);
  assert.throws(() => validate({ nome: ' ', data_fundacao: '2000-01-01', serie: 'A' }, 'equipe'));
});

test('rejeita amanhã mesmo depois da virada do dia em UTC', t => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/Sao_Paulo';
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-01-02T01:00:00Z') });
  try {
    const team = { nome: 'Clube Teste', data_fundacao: '2026-01-01', serie: 'A' };
    assert.equal(validate(team, 'equipe')[1], '2026-01-01');
    assert.throws(() => validate({ ...team, data_fundacao: '2026-01-02' }, 'equipe'), { status: 400 });
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
