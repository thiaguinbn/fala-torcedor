import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { HttpError, parseId, validate } from './validation.js';

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

const equipeSelect = `SELECT e.id, e.nome, to_char(e.data_fundacao, 'YYYY-MM-DD') AS data_fundacao,
  e.serie, (SELECT COUNT(*)::int FROM torcedor t WHERE t.equipe_id = e.id) AS total_torcedores FROM equipe e`;
const torcedorSelect = `SELECT t.id, t.nome, t.cpf, to_char(t.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
  t.equipe_id, e.nome AS equipe_nome, e.serie AS equipe_serie FROM torcedor t JOIN equipe e ON e.id = t.equipe_id`;

app.get('/api/equipes', async (_req, res) => {
  res.json((await pool.query(equipeSelect + ' ORDER BY e.nome, e.id')).rows);
});
app.get('/api/torcedores', async (_req, res) => {
  res.json((await pool.query(torcedorSelect + ' ORDER BY t.nome, t.id')).rows);
});

// As duas entidades têm rotas explícitas; os parâmetros sempre vão separados do SQL.
app.get('/api/equipes/:id', async (req, res) => {
  const { rows } = await pool.query(equipeSelect + ' WHERE e.id = $1', [parseId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Equipe não encontrada.');
  res.json(rows[0]);
});
app.get('/api/torcedores/:id', async (req, res) => {
  const { rows } = await pool.query(torcedorSelect + ' WHERE t.id = $1', [parseId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Torcedor não encontrado.');
  res.json(rows[0]);
});
app.post('/api/equipes', async (req, res) => {
  const values = validate(req.body, 'equipe');
  const { rows } = await pool.query('INSERT INTO equipe (nome, data_fundacao, serie) VALUES ($1,$2,$3) RETURNING id', values);
  res.status(201).json(rows[0]);
});
app.put('/api/equipes/:id', async (req, res) => {
  const values = validate(req.body, 'equipe');
  const { rowCount } = await pool.query('UPDATE equipe SET nome=$1, data_fundacao=$2, serie=$3 WHERE id=$4', [...values, parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Equipe não encontrada.');
  res.json({ mensagem: 'Equipe atualizada.' });
});
app.delete('/api/equipes/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM equipe WHERE id=$1', [parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Equipe não encontrada.');
  res.status(204).end();
});
app.post('/api/torcedores', async (req, res) => {
  const values = validate(req.body, 'torcedor');
  const { rows } = await pool.query('INSERT INTO torcedor (nome, cpf, data_nascimento, equipe_id) VALUES ($1,$2,$3,$4) RETURNING id', values);
  res.status(201).json(rows[0]);
});
app.put('/api/torcedores/:id', async (req, res) => {
  const values = validate(req.body, 'torcedor');
  const { rowCount } = await pool.query('UPDATE torcedor SET nome=$1, cpf=$2, data_nascimento=$3, equipe_id=$4 WHERE id=$5', [...values, parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Torcedor não encontrado.');
  res.json({ mensagem: 'Torcedor atualizado.' });
});
app.delete('/api/torcedores/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM torcedor WHERE id=$1', [parseId(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Torcedor não encontrado.');
  res.status(204).end();
});

app.use((_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));
app.use((error, req, res, _next) => {
  if (error.code === '23505') return res.status(409).json({ erro: error.constraint === 'torcedor_cpf_key' ? 'Este CPF já está cadastrado.' : 'Já existe uma equipe com esse nome.' });
  if (['23503', '23001'].includes(error.code)) return res.status(409).json({ erro: req.method === 'DELETE' ? 'Esta equipe possui torcedores. Transfira ou exclua os torcedores antes de excluir a equipe.' : 'A equipe selecionada não existe mais. Atualize a página.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ erro: 'Requisição muito grande.' });
  if (error instanceof HttpError) return res.status(error.status).json({ erro: error.message });
  console.error('Falha na API:', error.code || error.name);
  res.status(500).json({ erro: 'Não foi possível concluir a operação. Tente novamente.' });
});
