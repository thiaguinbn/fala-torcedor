import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL no arquivo .env da raiz.');

// Um pool reaproveita conexões entre as requisições.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
