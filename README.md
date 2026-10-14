# API SAEP — Estoque

Projeto Node.js, Express e MySQL adaptado ao documento do Notion fornecido.

## Requisitos

- Node.js 18 ou superior
- MySQL 8.0.16 ou superior
- npm

## Instalação

1. Abra a pasta `saep_api_notion` no VS Code.
2. Execute `npm install`.
3. No MySQL Workbench, execute `database/schema.sql` para criar o banco `estoque_saep`, as tabelas e a view.
4. Se quiser inserir dados de teste, execute `database/dados-exemplo.sql` apenas uma vez, em um banco vazio.
5. Copie `.env.example` para `.env` e ajuste `DB_PASSWORD` e `DB_PORT` para a sua instalação do MySQL. O exemplo usa porta 3307, como o projeto enviado; se seu MySQL usa 3306, altere para 3306.
6. Execute `npm run dev` ou `npm start`.
7. Abra `http://localhost:3000/app/` para usar o painel web. O endpoint `http://localhost:3000/` continua exibindo o status da API.

A API utiliza o banco `estoque_saep` descrito no Notion. O banco antigo `estoque_db`, do arquivo enviado, usa identificadores diferentes e não é convertido automaticamente. O script `schema.sql` não apaga bancos ou registros já existentes.

## Rotas

| Método | Endpoint | Função |
| --- | --- | --- |
| GET | `/` | Conferir se a API iniciou |
| GET | `/produtos` | Listar produtos |
| GET | `/produtos/:id` | Consultar produto |
| POST | `/produtos` | Cadastrar produto |
| PUT | `/produtos/:id` | Editar produto |
| DELETE | `/produtos/:id` | Excluir produto sem movimentações |
| POST | `/produtos/:id/entrada` | Adicionar estoque e registrar entrada |
| POST | `/produtos/:id/saida` | Baixar estoque e registrar saída |
| GET | `/produtos/estoque` | Consultar `vw_estoque` |
| GET | `/produtos/valor-total-categoria` | Valor financeiro por categoria |
| GET | `/produtos/saidas` | Histórico de saídas por data decrescente |
| GET | `/produtos/limites` | Produtos com estoque 0 ou pelo menos 100 |
| GET | `/produtos/movimentacoes-periodo?dataInicial=2026-06-01&dataFinal=2026-06-30` | Relatório de entradas e saídas por produto no período |
| GET | `/produtos/maior-saida?dataInicial=2026-06-01&dataFinal=2026-06-30` | Maior volume de saída no período |

## Exemplos de JSON

Cadastro (`POST /produtos`):

```json
{
  "nome": "Cabo USB-C",
  "valor": 25.90,
  "quantidade": 30,
  "categoria": "Cabos",
  "unidade_medida": "unidade"
}
```

A edição (`PUT /produtos/:id`) recebe o mesmo formato. Em cadastro, `unidade_medida` é opcional e assume `unidade`; em edição, quando omitida, mantém o valor existente.

Entrada (`POST /produtos/1/entrada`) ou saída (`POST /produtos/1/saida`):

```json
{
  "quantidade": 5
}
```

As movimentações registram a data atual do servidor MySQL. Ambas utilizam transação e bloqueio da linha do produto. Saídas que ultrapassem o estoque disponível são recusadas.

## Relatórios

`movimentacoes-periodo` retorna nome do produto, unidade de medida, total de entradas, total de saídas, saldo no período, valor financeiro das entradas e valor financeiro das saídas. Produtos sem movimentações no período também aparecem, com totais zerados.

`maior-saida` retorna nome do produto, quantidade total de saída e valor financeiro das saídas em ordem decrescente.

Valores financeiros das movimentações são calculados com o valor atual do produto, conforme as consultas da documentação original, e não preservam o preço histórico de cada movimentação.

## Testes

Execute `npm test` para os testes automatizados. Há também uma coleção importável no Postman em `tests/SAEP-Estoque.postman_collection.json`.

Se o MySQL rejeitar a conexão, verifique usuário, senha, porta e se o serviço está iniciado. Se você ainda utiliza o banco `estoque_db`, crie o banco `estoque_saep` com `database/schema.sql` e use esse novo schema.

