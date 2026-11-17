import { app } from './app.js';
import { pool } from './db.js';
const port = Number(process.env.PORT || 3001);
try {
  await pool.query('SELECT 1');
  const server = app.listen(port, () => console.log(`API disponível em http://localhost:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    server.close(async () => { await pool.end(); process.exit(0); });
  });
} catch (error) {
  console.error('Falha ao conectar ao PostgreSQL:', error.message);
  await pool.end();
  process.exitCode = 1;
}
