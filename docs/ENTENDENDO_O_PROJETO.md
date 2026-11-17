# Como explicar o Fala Torcedor

## O caminho de um cadastro

1. Você preenche o formulário em React. O `useState` mantém os valores digitados.
2. Ao salvar, `save()` em `App.jsx` chama `api()` com método `POST` e os dados em JSON.
3. O Vite encaminha a chamada `/api/torcedores` para o servidor Node na porta 3001.
4. O Express recebe a requisição e `validate()` confere nome, CPF, data e equipe.
5. `pool.query()` executa o `INSERT` parametrizado no PostgreSQL.
6. O banco atribui o ID e verifica o CPF único e a existência da equipe.
7. A API devolve `201` com o ID. O React busca a lista novamente e exibe o cadastro salvo.

## Onde está o CRUD?

| Letra | Significado | Na interface | Na API | No SQL |
| --- | --- | --- | --- | --- |
| C | Create | Novo torcedor/equipe | POST | INSERT |
| R | Read | Listas e busca | GET | SELECT |
| U | Update | Botão de lápis | PUT | UPDATE |
| D | Delete | Botão de lixeira e confirmação | DELETE | DELETE |

A busca da tela filtra os registros já carregados no navegador. Ela não cria uma nova consulta SQL.

## Por que existem duas tabelas?

Uma equipe pode ter muitos torcedores. Repetir todos os dados da equipe em cada torcedor causaria duplicação. Guardamos a equipe uma vez e colocamos seu ID no campo `equipe_id` do torcedor. Essa coluna é uma chave estrangeira. O `JOIN` reúne as duas tabelas na consulta para mostrar o nome da equipe junto do torcedor.

## Conceitos para revisar

- **Componente React:** função que devolve a interface. `App` é o componente principal.
- **Estado (`useState`):** dados que, quando mudam, atualizam o que aparece na tela.
- **Efeito (`useEffect`):** usado para carregar os dados iniciais e sincronizar o modal.
- **`async` / `await`:** permitem aguardar rede ou banco sem bloquear o servidor enquanto a operação acontece.
- **API REST:** interface HTTP com rotas para recursos e métodos para as operações.
- **Pool:** conjunto de conexões reaproveitadas para falar com o banco.
- **Chave primária:** ID que identifica um registro.
- **Restrição única:** impede dois torcedores com o mesmo CPF.
- **Consulta parametrizada:** `WHERE id=$1` recebe o valor em um array separado, protegendo contra injeção de SQL.
- **Código HTTP:** informa o resultado. Por exemplo, `201` significa criado e `409` representa um conflito.

## Roteiro de demonstração

1. Mostre as listas vazias.
2. Cadastre duas equipes e um torcedor com CPF fictício válido.
3. Busque pelo nome e filtre pela equipe.
4. Edite o torcedor e troque sua equipe.
5. Tente repetir o CPF e mostre a mensagem.
6. Tente excluir a equipe com torcedor e explique a chave estrangeira.
7. Exclua o torcedor, depois a equipe.
8. Reinicie a aplicação e explique que os dados ficam no PostgreSQL.

Leia o código e execute cada etapa antes da entrevista. É melhor explicar com suas palavras o que você entende e dizer onde teve ajuda do que afirmar domínio de algo que ainda está aprendendo.

## Exercícios para ganhar domínio

- Alterar um texto ou uma cor da interface.
- Encontrar a linha que faz o `INSERT` do torcedor.
- Explicar o que acontece se a API ficar indisponível.
- Adicionar, por conta própria, um campo opcional e acompanhar a mudança no SQL, API e formulário.
