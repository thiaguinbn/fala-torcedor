import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
try {
  const sql = await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Tabelas equipe e torcedor prontas.');
} catch (error) {
  console.error('Não foi possível preparar o banco:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
