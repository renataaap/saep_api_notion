# Estoque SAEP

Aplicação de controle de estoque com frontend Next.js, API Express e banco MySQL. O frontend e a API são servidos pelo mesmo processo e pela mesma porta, tanto localmente quanto no Railway.

## Recursos

- Visão geral com produtos, unidades, valor armazenado e alertas
- Cadastro, edição e exclusão de produtos
- Registro transacional de entradas e saídas
- Filtro por nome e categoria
- Relatórios por período e por categoria
- Layout responsivo para computador e celular

## Executar localmente

Requisitos: Node.js 20.9 ou superior e MySQL 8.

1. Copie `.env.example` para `.env` e configure as credenciais do MySQL.
2. Execute `npm install`.
3. Execute `npm run db:init` para criar as tabelas e a view.
4. Execute `npm run dev`.
5. Abra `http://localhost:3000`.

Para validar o build de produção:

```bash
npm run build
npm start
```

## Deploy no Railway

O arquivo `railway.json` já configura build, inicialização do banco, start, healthcheck e política de reinício.

1. Crie um projeto no Railway e conecte este repositório.
2. Adicione um serviço MySQL ao mesmo projeto.
3. No serviço da aplicação, crie referências para as variáveis do MySQL:

```text
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
```

4. Gere um domínio público para o serviço da aplicação.

Não configure `PORT`: o Railway fornece essa variável automaticamente. No primeiro deploy, `npm run db:init` cria as tabelas e a view sem apagar dados existentes.

## Rotas da API

| Método | Endpoint | Função |
| --- | --- | --- |
| GET | `/health` | Verifica aplicação e banco |
| GET | `/produtos` | Lista produtos |
| GET | `/produtos/:id` | Consulta um produto |
| POST | `/produtos` | Cadastra um produto |
| PUT | `/produtos/:id` | Edita um produto |
| DELETE | `/produtos/:id` | Exclui produto sem movimentações |
| POST | `/produtos/:id/entrada` | Registra entrada |
| POST | `/produtos/:id/saida` | Registra saída |
| GET | `/produtos/estoque` | Consulta o valor do estoque |
| GET | `/produtos/valor-total-categoria` | Valor por categoria |
| GET | `/produtos/saidas` | Histórico de saídas |
| GET | `/produtos/limites` | Produtos nos limites mínimo ou máximo |
| GET | `/produtos/movimentacoes-periodo` | Movimentações por período |
| GET | `/produtos/maior-saida` | Produtos com maior saída no período |

## Testes

```bash
npm test
```
