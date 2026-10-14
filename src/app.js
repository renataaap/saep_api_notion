const express = require('express');
const cors = require('cors');
const criarRotasProdutos = require('./routes/produtos.routes');

function criarApp(pool) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      mensagem: 'API de Estoque SAEP funcionando',
      rotas: [
        'GET /produtos',
        'GET /produtos/:id',
        'POST /produtos',
        'PUT /produtos/:id',
        'DELETE /produtos/:id',
        'POST /produtos/:id/entrada',
        'POST /produtos/:id/saida',
        'GET /produtos/estoque',
        'GET /produtos/valor-total-categoria',
        'GET /produtos/saidas',
        'GET /produtos/limites',
        'GET /produtos/movimentacoes-periodo?dataInicial=2026-06-01&dataFinal=2026-06-30',
        'GET /produtos/maior-saida?dataInicial=2026-06-01&dataFinal=2026-06-30'
      ]
    });
  });

  app.use('/produtos', criarRotasProdutos(pool));

  app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });

  app.use((erro, req, res, next) => {
    if (erro.status === 400 && erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON inválido.' });
    }
    if (erro.code === 'ER_ROW_IS_REFERENCED_2' || erro.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ erro: 'O produto possui movimentações e não pode ser excluído.' });
    }
    if (['ECONNREFUSED', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(erro.code)) {
      console.error('Erro de conexão com o MySQL:', erro.message);
      return res.status(503).json({ erro: 'Banco de dados indisponível. Verifique a configuração do MySQL.' });
    }
    console.error('Erro na API:', erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  });

  return app;
}

module.exports = criarApp;
