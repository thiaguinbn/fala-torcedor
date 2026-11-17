BEGIN;
CREATE TABLE IF NOT EXISTS equipe (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(100) NOT NULL CHECK (length(trim(nome)) BETWEEN 2 AND 100),
  data_fundacao DATE NOT NULL CHECK (data_fundacao <= CURRENT_DATE),
  serie VARCHAR(10) NOT NULL CHECK (serie IN ('A', 'B', 'C', 'D', 'Sem série'))
);
CREATE UNIQUE INDEX IF NOT EXISTS equipe_nome_unico ON equipe (lower(nome));

CREATE TABLE IF NOT EXISTS torcedor (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(100) NOT NULL CHECK (length(trim(nome)) BETWEEN 2 AND 100),
  cpf VARCHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
  data_nascimento DATE NOT NULL CHECK (data_nascimento <= CURRENT_DATE),
  equipe_id INTEGER NOT NULL REFERENCES equipe(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS torcedor_equipe_idx ON torcedor(equipe_id);
COMMIT;
