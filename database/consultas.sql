USE saep_dvn;

SELECT * FROM produtos;

SELECT * FROM movimentacoes;

SELECT * FROM vw_estoque;

SELECT categoria, ROUND(SUM(quantidade * valor), 2) AS valor_total_categoria
FROM produtos
GROUP BY categoria
ORDER BY valor_total_categoria DESC;

SELECT m.id, m.data, m.tipo, m.quantidade, p.nome AS nome_produto
FROM movimentacoes m
JOIN produtos p ON p.id = m.id_produto
WHERE m.tipo = 'saida'
ORDER BY m.data DESC, m.id DESC;

SELECT id, nome, quantidade, 100 AS limite_maximo,
       ROUND((quantidade / 100) * 100, 2) AS percentual_nivel
FROM produtos
WHERE quantidade = 0 OR quantidade >= 100;

SELECT nome_produto, unidade_medida, total_entradas, total_saidas,
       saldo_periodo, valor_total_financeiro_entradas, valor_total_financeiro_saidas
FROM (
    SELECT p.id, p.nome AS nome_produto, p.unidade_medida,
        COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0) AS total_saidas,
        COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0) AS saldo_periodo,
        ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade * p.valor ELSE 0 END), 0), 2) AS valor_total_financeiro_entradas,
        ROUND(COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade * p.valor ELSE 0 END), 0), 2) AS valor_total_financeiro_saidas
    FROM produtos p
    LEFT JOIN movimentacoes m ON m.id_produto = p.id AND m.data BETWEEN '2026-06-01' AND '2026-06-30'
    GROUP BY p.id, p.nome, p.unidade_medida, p.valor
) AS relatorio
ORDER BY nome_produto;

SELECT p.nome AS nome_produto, SUM(m.quantidade) AS quantidade_total_saida,
       ROUND(SUM(m.quantidade * p.valor), 2) AS valor_total_financeiro_saidas
FROM produtos p
JOIN movimentacoes m ON m.id_produto = p.id
WHERE m.tipo = 'saida' AND m.data BETWEEN '2026-06-01' AND '2026-06-30'
GROUP BY p.id, p.nome
ORDER BY quantidade_total_saida DESC, p.nome ASC;

INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida) VALUES
('Teclado mecânico', 150.00, 20, 'Periféricos', 'unidade'),
('Mouse gamer', 80.50, 15, 'Periféricos', 'unidade'),
('Monitor 24 polegadas', 850.00, 5, 'Monitores', 'unidade');

INSERT INTO movimentacoes (data, tipo, quantidade, id_produto) VALUES
('2026-06-05', 'entrada', 10, 1),
('2026-06-08', 'saida', 2, 1),
('2026-06-09', 'saida', 1, 2);