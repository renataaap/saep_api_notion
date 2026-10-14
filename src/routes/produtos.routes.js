const express = require('express');
const {
  validarId,
  validarQuantidade,
  validarProduto,
  validarPeriodo
} = require('../utils/validacao');

function criarRotasProdutos(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const [produtos] = await pool.execute('SELECT id, nome, valor, quantidade, categoria, unidade_medida FROM produtos ORDER BY id');
    res.json(produtos);
  });

  router.post('/', async (req, res) => {
    const validacao = validarProduto(req.body);
    if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
    const { nome, valor, quantidade, categoria, unidade_medida } = validacao.dados;
    const [resultado] = await pool.execute(
      'INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida) VALUES (?, ?, ?, ?, ?)',
      [nome, valor, quantidade, categoria, unidade_medida ?? 'unidade']
    );
    res.status(201).json({ mensagem: 'Produto cadastrado com sucesso', id: resultado.insertId });
  });

  router.get('/estoque', async (req, res) => {
    const [estoque] = await pool.execute('SELECT id, nome, categoria, unidade_medida, quantidade, valor, valor_total FROM vw_estoque ORDER BY nome');
    res.json(estoque);
  });

  router.get('/valor-total-categoria', async (req, res) => {
    const [relatorio] = await pool.execute(`
      SELECT categoria, ROUND(SUM(quantidade * valor), 2) AS valor_total_categoria
      FROM produtos
      GROUP BY categoria
      ORDER BY valor_total_categoria DESC, categoria ASC
    `);
    res.json(relatorio);
  });

  router.get('/saidas', async (req, res) => {
    const [saidas] = await pool.execute(`
      SELECT m.id, m.data, m.tipo, m.quantidade, m.id_produto, p.nome AS nome_produto
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.id_produto
      WHERE m.tipo = 'saida'
      ORDER BY m.data DESC, m.id DESC
    `);
    res.json(saidas);
  });

  router.get('/limites', async (req, res) => {
    const [limites] = await pool.execute(`
      SELECT id, nome, quantidade, 100 AS limite_maximo,
        ROUND((quantidade / 100) * 100, 2) AS percentual_nivel,
        CASE WHEN quantidade = 0 THEN 'mínimo' ELSE 'máximo' END AS status_limite
      FROM produtos
      WHERE quantidade = 0 OR quantidade >= 100
      ORDER BY quantidade ASC, nome ASC
    `);
    res.json(limites);
  });

  router.get('/movimentacoes-periodo', async (req, res) => {
    const periodo = validarPeriodo(req.query);
    if (periodo.erro) return res.status(400).json({ erro: periodo.erro });
    const [relatorio] = await pool.execute(`
      SELECT p.nome AS nome_produto, p.unidade_medida AS unidade_medida,
        COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0) AS total_saidas,
        COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0) AS saldo_periodo,
        ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade * p.valor ELSE 0 END), 0), 2) AS valor_total_financeiro_entradas,
        ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade * p.valor ELSE 0 END), 0), 2) AS valor_total_financeiro_saidas
      FROM produtos p
      LEFT JOIN movimentacoes m ON m.id_produto = p.id AND m.data BETWEEN ? AND ?
      GROUP BY p.id, p.nome, p.unidade_medida, p.valor
      ORDER BY p.nome ASC
    `, [periodo.dataInicial, periodo.dataFinal]);
    res.json(relatorio);
  });

  router.get('/maior-saida', async (req, res) => {
    const periodo = validarPeriodo(req.query);
    if (periodo.erro) return res.status(400).json({ erro: periodo.erro });
    const [relatorio] = await pool.execute(`
      SELECT p.nome AS nome_produto,
        SUM(m.quantidade) AS quantidade_total_saida,
        ROUND(SUM(m.quantidade * p.valor), 2) AS valor_total_financeiro_saidas
      FROM produtos p
      JOIN movimentacoes m ON m.id_produto = p.id
      WHERE m.tipo = 'saida' AND m.data BETWEEN ? AND ?
      GROUP BY p.id, p.nome
      ORDER BY quantidade_total_saida DESC, p.nome ASC
    `, [periodo.dataInicial, periodo.dataFinal]);
    res.json(relatorio);
  });

  router.get('/:id', async (req, res) => {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID de produto inválido.' });
    const [produtos] = await pool.execute(
      'SELECT id, nome, valor, quantidade, categoria, unidade_medida FROM produtos WHERE id = ?',
      [id]
    );
    if (produtos.length === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(produtos[0]);
  });

  router.put('/:id', async (req, res) => {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID de produto inválido.' });
    const validacao = validarProduto(req.body);
    if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
    const { nome, valor, quantidade, categoria, unidade_medida } = validacao.dados;
    const [resultado] = await pool.execute(
      'UPDATE produtos SET nome = ?, valor = ?, quantidade = ?, categoria = ?, unidade_medida = COALESCE(?, unidade_medida) WHERE id = ?',
      [nome, valor, quantidade, categoria, unidade_medida ?? null, id]
    );
    if (resultado.affectedRows === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json({ mensagem: 'Produto atualizado com sucesso.' });
  });

  router.delete('/:id', async (req, res) => {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID de produto inválido.' });
    const [resultado] = await pool.execute('DELETE FROM produtos WHERE id = ?', [id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json({ mensagem: 'Produto excluído com sucesso.' });
  });

  async function movimentar(req, res, tipo) {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID de produto inválido.' });
    const quantidade = req.body?.quantidade;
    if (!validarQuantidade(quantidade)) {
      return res.status(400).json({ erro: 'A quantidade deve ser um número inteiro positivo.' });
    }

    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();
      const [produtos] = await conexao.execute(
        'SELECT quantidade FROM produtos WHERE id = ? FOR UPDATE',
        [id]
      );
      if (produtos.length === 0) {
        await conexao.rollback();
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      const estoqueAtual = produtos[0].quantidade;
      if (tipo === 'saida' && estoqueAtual < quantidade) {
        await conexao.rollback();
        return res.status(409).json({ erro: 'Estoque insuficiente para registrar a saída.' });
      }
      if (tipo === 'entrada' && estoqueAtual + quantidade > 2147483647) {
        await conexao.rollback();
        return res.status(400).json({ erro: 'Quantidade excede o limite do estoque.' });
      }

      const quantidadeAtualizada = tipo === 'entrada'
        ? estoqueAtual + quantidade
        : estoqueAtual - quantidade;
      await conexao.execute('UPDATE produtos SET quantidade = ? WHERE id = ?', [quantidadeAtualizada, id]);
      const [resultado] = await conexao.execute(
        'INSERT INTO movimentacoes (data, tipo, quantidade, id_produto) VALUES (CURDATE(), ?, ?, ?)',
        [tipo, quantidade, id]
      );
      await conexao.commit();
      return res.status(201).json({
        mensagem: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso.`,
        id_movimentacao: resultado.insertId,
        id_produto: id,
        quantidade_atual: quantidadeAtualizada
      });
    } catch (erro) {
      try {
        await conexao.rollback();
      } catch (erroRollback) {
        console.error('Erro ao reverter transação:', erroRollback);
      }
      throw erro;
    } finally {
      conexao.release();
    }
  }

  router.post('/:id/entrada', async (req, res) => movimentar(req, res, 'entrada'));
  router.post('/:id/saida', async (req, res) => movimentar(req, res, 'saida'));

  return router;
}

module.exports = criarRotasProdutos;
