import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

test('CRUD HTTP com PostgreSQL real e esquema isolado', { skip: !process.env.TEST_DATABASE_URL }, async t => {
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `test_${Date.now()}_${process.pid}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  const { app } = await import('../src/app.js');
  const { pool } = await import('../src/db.js');
  let server;
  try {
    await pool.query(await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, method = 'GET', body) {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: response.status === 204 ? null : await response.json() };
    }
    let teamId, fanId;
    const team = { nome: 'Equipe de Teste', data_fundacao: '1900-01-01', serie: 'A' };
    const fan = { nome: 'Pessoa de Teste', cpf: '529.982.247-25', data_nascimento: '2000-02-29' };
    await t.test('banco disponível e listas inicialmente vazias', async () => {
      assert.equal((await request('/health')).status, 200);
      assert.deepEqual((await request('/equipes')).body, []);
      assert.deepEqual((await request('/torcedores')).body, []);
    });
    await t.test('cria equipe e impede nome duplicado sem diferenciar maiúsculas', async () => {
      const created = await request('/equipes', 'POST', team);
      assert.equal(created.status, 201); teamId = created.body.id;
      assert.equal((await request('/equipes', 'POST', { ...team, nome: team.nome.toLowerCase() })).status, 409);
      assert.equal((await request(`/equipes/${teamId}`)).body.data_fundacao, team.data_fundacao);
    });
    await t.test('rejeita CPF inválido e equipe inexistente', async () => {
      assert.equal((await request('/torcedores', 'POST', { ...fan, cpf: '11111111111', equipe_id: teamId })).status, 400);
      assert.equal((await request('/torcedores', 'POST', { ...fan, equipe_id: 999999 })).status, 409);
    });
    await t.test('cria torcedor, mantém a relação e impede CPF duplicado', async () => {
      const created = await request('/torcedores', 'POST', { ...fan, equipe_id: teamId });
      assert.equal(created.status, 201); fanId = created.body.id;
      const saved = (await request(`/torcedores/${fanId}`)).body;
      assert.equal(saved.equipe_nome, team.nome);
      assert.equal(saved.data_nascimento, fan.data_nascimento);
      assert.equal(saved.cpf, '52998224725');
      assert.equal((await request('/torcedores', 'POST', { ...fan, equipe_id: teamId })).status, 409);
      assert.equal((await request('/equipes')).body[0].total_torcedores, 1);
    });
    await t.test('bloqueia exclusão de equipe vinculada', async () => {
      assert.equal((await request(`/equipes/${teamId}`, 'DELETE')).status, 409);
    });
    await t.test('edita os dois cadastros e consulta os dados atualizados', async () => {
      assert.equal((await request(`/equipes/${teamId}`, 'PUT', { ...team, nome: 'Equipe Editada', serie: 'B' })).status, 200);
      assert.equal((await request(`/torcedores/${fanId}`, 'PUT', { ...fan, nome: 'Torcedor Editado', equipe_id: teamId })).status, 200);
      const saved = (await request('/torcedores')).body[0];
      assert.equal(saved.nome, 'Torcedor Editado');
      assert.equal(saved.equipe_nome, 'Equipe Editada');
      assert.equal(saved.equipe_serie, 'B');
    });
    await t.test('rejeita IDs, JSON e rotas inválidos sem expor erros internos', async () => {
      assert.equal((await request('/equipes/1abc')).status, 400);
      assert.equal((await request('/equipes/999999')).status, 404);
      assert.equal((await request('/nao-existe')).status, 404);
      const bad = await fetch(base + '/equipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
      assert.equal(bad.status, 400);
      assert.deepEqual(await bad.json(), { erro: 'JSON inválido.' });
    });
    await t.test('exclui torcedor, depois equipe, e confirma persistência das exclusões', async () => {
      assert.equal((await request(`/torcedores/${fanId}`, 'DELETE')).status, 204);
      assert.equal((await request(`/torcedores/${fanId}`)).status, 404);
      assert.equal((await request(`/equipes/${teamId}`, 'DELETE')).status, 204);
      assert.equal((await request(`/equipes/${teamId}`, 'DELETE')).status, 404);
      assert.deepEqual((await request('/equipes')).body, []);
      assert.deepEqual((await request('/torcedores')).body, []);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
