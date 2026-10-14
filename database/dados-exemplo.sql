USE estoque_saep;

INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida) VALUES
('Teclado mecânico', 150.00, 20, 'Periféricos', 'unidade'),
('Mouse gamer', 80.50, 15, 'Periféricos', 'unidade'),
('Monitor 24 polegadas', 850.00, 5, 'Monitores', 'unidade');

INSERT INTO movimentacoes (data, tipo, quantidade, id_produto) VALUES
('2026-06-05', 'entrada', 10, 1),
('2026-06-08', 'saida', 2, 1),
('2026-06-09', 'saida', 1, 2);
