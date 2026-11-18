# Fala Torcedor ⚽

Aplicação de cadastro e gestão de **torcedores e equipes**, com frontend em **React**, API em **Node.js / Express** e persistência em **PostgreSQL**.

Desenvolvida a partir do exercício de CRUD: a interface conversa com o backend e o backend consulta duas tabelas relacionadas no banco. O projeto prioriza código legível, SQL explícito e uma estrutura pequena, adequada para estudo e apresentação em um processo de estágio.

## Funcionalidades

- Cadastrar, listar, consultar, editar e excluir torcedores e equipes.
- Vincular cada torcedor a uma equipe existente.
- Buscar torcedores por nome ou CPF, buscar equipes por nome e filtrar as listas.
- Mostrar contagem de cadastros e de torcedores por equipe.
- Validar CPF (incluindo dígitos verificadores), datas, nomes e série.
- Impedir CPF e nomes de equipe duplicados e exclusão de equipes vinculadas.
- Exibir estados de carregamento, listas vazias, erros e confirmação de exclusão.
- Usar interface responsiva com formulários acessíveis por teclado.

## Como executar

**Requisitos:** Node.js 22 ou superior, npm e Docker com Docker Compose (ou PostgreSQL já instalado).

```bash
git clone https://github.com/thiaguinbn/fala-torcedor.git
cd fala-torcedor
npm ci
```

1. Copie `.env.example` para `.env` na raiz do projeto.
   - Linux/macOS: `cp .env.example .env`
   - PowerShell: `Copy-Item .env.example .env`
2. Inicie somente o banco com Docker:

```bash
docker compose up -d --wait
```

3. Crie as tabelas e inicie frontend e backend:

```bash
npm run db:migrate
npm run dev
```

Abra **http://localhost:5173**. API: **http://localhost:3001/api/health**.

Cadastre primeiro uma equipe, depois um torcedor. O banco começa vazio: não há dados pessoais ou cadastros fictícios automáticos. Os dados permanecem no volume `postgres_data` entre reinicializações. `docker compose stop` interrompe o banco sem remover os dados.

### Sem Docker

Crie um banco chamado `fala_torcedor` no seu PostgreSQL e ajuste `DATABASE_URL` no `.env` com usuário, senha, host e porta. Execute `npm run db:migrate` e `npm run dev` normalmente. Não é preciso executar o SQL manualmente: a migração lê `database/schema.sql` e cria as tabelas. A migração pode ser repetida, mas não modifica tabelas já existentes se você alterar o esquema no futuro.

### Testes e build

```bash
npm test
npm run build
```

Sem `TEST_DATABASE_URL`, os testes de validação executam e a integração é explicitamente marcada como ignorada. Para testar HTTP e persistência, use um banco PostgreSQL de teste e defina a variável antes de executar:

```bash
# Linux/macOS
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fala_torcedor npm test
```

```powershell
# PowerShell
$env:TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fala_torcedor"
npm test
```

A integração cria e remove um esquema exclusivo `test_...`, sem apagar as tabelas do aplicativo. A conta do banco precisa de permissão para criar esquemas. O GitHub Actions executa testes com PostgreSQL e o build automaticamente.

O build gera `frontend/dist`. Para inspecioná-lo localmente, mantenha a API rodando com `npm start` e use, em outro terminal, `npm run preview -w frontend`. O preview também encaminha `/api` para a API local.

## Modelagem

| Tabela | Campos |
| --- | --- |
| `equipe` | `id`, `nome`, `data_fundacao`, `serie` |
| `torcedor` | `id`, `nome`, `cpf`, `data_nascimento`, `equipe_id` |

```mermaid
erDiagram
    EQUIPE ||--o{ TORCEDOR : possui
    EQUIPE {
        int id PK
        varchar nome UK
        date data_fundacao
        varchar serie
    }
    TORCEDOR {
        int id PK
        varchar nome
        varchar cpf UK
        date data_nascimento
        int equipe_id FK
    }
```

Os campos foram interpretados da foto do enunciado. Foram adicionados IDs para identificar registros e `equipe_id` para representar a relação. Cada torcedor possui uma equipe; uma equipe pode ter zero ou vários torcedores. Série aceita `A`, `B`, `C`, `D` e `Sem série`, sem depender de uma temporada específica. O nome da equipe é único sem distinguir maiúsculas de minúsculas. O CPF é guardado como texto de 11 dígitos para preservar zeros à esquerda.

## API

Prefixo: `/api`. Requisições e respostas usam JSON, exceto exclusão bem-sucedida (`204`, sem corpo).

| Método | Rota | Operação |
| --- | --- | --- |
| GET | `/health` | Verificar conexão com o banco |
| GET | `/equipes` | Listar equipes e total de torcedores |
| GET | `/equipes/:id` | Consultar uma equipe |
| POST | `/equipes` | Cadastrar equipe |
| PUT | `/equipes/:id` | Atualizar todos os campos da equipe |
| DELETE | `/equipes/:id` | Excluir equipe sem torcedores |
| GET | `/torcedores` | Listar torcedores com nome da equipe |
| GET | `/torcedores/:id` | Consultar um torcedor |
| POST | `/torcedores` | Cadastrar torcedor |
| PUT | `/torcedores/:id` | Atualizar todos os campos do torcedor |
| DELETE | `/torcedores/:id` | Excluir torcedor |

Exemplo de corpo para equipe:

```json
{ "nome": "Equipe Exemplo", "data_fundacao": "1950-05-10", "serie": "A" }
```

Para torcedor, envie `nome`, `cpf` (um CPF de teste válido), `data_nascimento` (`YYYY-MM-DD`) e `equipe_id` (o ID retornado ao cadastrar a equipe). Não use dados reais para demonstrações.

Status: `200` consulta/edição, `201` criação (retorna `{ "id": ... }`), `204` exclusão, `400` entrada inválida, `404` registro/rota inexistente, `409` duplicidade ou vínculo impeditivo, `500` falha inesperada. Erros retornam `{ "erro": "mensagem" }`.

## Estrutura

```text
backend/
  src/app.js          Rotas HTTP e tratamento de erros
  src/db.js           Conexão com o PostgreSQL
  src/migrate.js      Criação das tabelas
  src/server.js       Inicialização da API
  src/validation.js   Regras de validação
  test/               Testes unitários e de integração
frontend/
  src/App.jsx         Telas, formulários e estado da interface
  src/api.js          Comunicação HTTP e formatação
  src/style.css       Estilos responsivos
database/schema.sql   Tabelas, índices e restrições
compose.yaml          PostgreSQL para desenvolvimento
```

## Decisões e limites

SQL parametrizado (`$1`, `$2`...) mantém os valores separados dos comandos SQL. As chaves e restrições do PostgreSQL também protegem a integridade, mesmo se alguém chamar a API diretamente. O frontend nunca se conecta ao banco.

O Vite encaminha `/api` para Node durante o desenvolvimento. A busca e os filtros são locais, apropriados ao volume pequeno deste exercício. Uma aplicação com muitos registros precisaria de paginação e busca na API. As fontes da interface têm fallback local se o Google Fonts estiver indisponível.

Este é um exercício local de CRUD, sem login e sem autorização por usuário. O CORS não substitui autenticação. Antes de disponibilizar uma instância com dados reais, implemente autenticação, controle de acesso, HTTPS e configuração de produção. A senha do Compose serve apenas ao ambiente local. A aplicação não é hospedada automaticamente pelo GitHub: o repositório contém o código para executar.

Veja [o guia para entender o projeto](docs/ENTENDENDO_O_PROJETO.md) antes de apresentá-lo.
