CREATE DATABASE IF NOT EXISTS estoque_saep CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE estoque_saep;

CREATE TABLE IF NOT EXISTS produtos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    quantidade INT NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'unidade',
    CONSTRAINT chk_produtos_valor CHECK (valor >= 0),
    CONSTRAINT chk_produtos_quantidade CHECK (quantidade >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    quantidade INT NOT NULL,
    id_produto INT NOT NULL,
    CONSTRAINT chk_movimentacoes_tipo CHECK (tipo IN ('entrada', 'saida')),
    CONSTRAINT chk_movimentacoes_quantidade CHECK (quantidade > 0),
    CONSTRAINT fk_movimentacoes_produtos FOREIGN KEY (id_produto)
        REFERENCES produtos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_movimentacoes_data_tipo (data, tipo),
    INDEX idx_movimentacoes_produto (id_produto)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_estoque AS
SELECT id, nome, categoria, unidade_medida, quantidade, valor,
       quantidade * valor AS valor_total
FROM produtos;


USE estoque_saep;

INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida) VALUES
('Teclado mecânico', 150.00, 20, 'Periféricos', 'unidade'),
('Mouse gamer', 80.50, 15, 'Periféricos', 'unidade'),
('Monitor 24 polegadas', 850.00, 5, 'Monitores', 'unidade');

INSERT INTO movimentacoes (data, tipo, quantidade, id_produto) VALUES
('2026-06-05', 'entrada', 10, 1),
('2026-06-08', 'saida', 2, 1),
('2026-06-09', 'saida', 1, 2);
