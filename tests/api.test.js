const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const criarApp = require('../src/app');

async function comServidor(pool, callback) {
  const server = criarApp(pool).listen(0);
  try {
    await once(server, 'listening');
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(erro => erro ? reject(erro) : resolve()));
  }
}

async function requisitar(base, caminho, opcoes = {}) {
  const resposta = await fetch(base + caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body)
  });
  return { status: resposta.status, corpo: await resposta.json() };
}

test('responde a rota inicial, lista produtos e protege rota inexistente', async () => {
  const pool = {
    execute: async sql => {
      assert.match(sql, /SELECT id, nome, valor, quantidade, categoria, unidade_medida FROM produtos/);
      return [[{ id: 1, nome: 'Teclado', valor: 150, quantidade: 20, categoria: 'Periféricos', unidade_medida: 'unidade' }]];
    }
  };
  await comServidor(pool, async base => {
    const inicio = await requisitar(base, '/');
    assert.equal(inicio.status, 200);
    assert.ok(inicio.corpo.rotas.includes('GET /produtos/limites'));
    const produtos = await requisitar(base, '/produtos');
    assert.equal(produtos.status, 200);
    assert.equal(produtos.corpo[0].id, 1);
    assert.equal((await requisitar(base, '/inexistente')).status, 404);
  });
});

test('cadastra produto válido, aceita estoque zero e recusa dados incompletos', async () => {
  let chamadas = 0;
  const pool = {
    execute: async (sql, parametros) => {
      chamadas++;
      assert.match(sql, /INSERT INTO produtos/);
      assert.deepEqual(parametros, ['Mouse', 80.5, 0, 'Periféricos', 'unidade']);
      return [{ insertId: 7 }];
    }
  };
  await comServidor(pool, async base => {
    const criado = await requisitar(base, '/produtos', {
      method: 'POST', body: { nome: 'Mouse', valor: 80.5, quantidade: 0, categoria: 'Periféricos' }
    });
    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.id, 7);
    const invalido = await requisitar(base, '/produtos', {
      method: 'POST', body: { nome: 'Mouse', valor: 80.5, quantidade: -2, categoria: 'Periféricos' }
    });
    assert.equal(invalido.status, 400);
    assert.equal(chamadas, 1);
  });
});

test('consulta relatório por período com parâmetros e rejeita data inválida', async () => {
  const pool = {
    execute: async (sql, parametros) => {
      assert.match(sql, /LEFT JOIN movimentacoes/);
      assert.match(sql, /valor_total_financeiro_saidas/);
      assert.deepEqual(parametros, ['2026-06-01', '2026-06-30']);
      return [[{ nome_produto: 'Teclado', total_entradas: 5, total_saidas: 2, saldo_periodo: 3 }]];
    }
  };
  await comServidor(pool, async base => {
    assert.equal((await requisitar(base, '/produtos/movimentacoes-periodo')).status, 400);
    const resultado = await requisitar(base, '/produtos/movimentacoes-periodo?dataInicial=2026-06-01&dataFinal=2026-06-30');
    assert.equal(resultado.status, 200);
    assert.equal(resultado.corpo[0].saldo_periodo, 3);
  });
});

test('registra entrada em transação e devolve estoque atualizado', async () => {
  const chamadas = [];
  const conexao = {
    beginTransaction: async () => { chamadas.push('begin'); },
    execute: async (sql, parametros) => {
      if (sql.includes('FOR UPDATE')) {
        chamadas.push('select');
        return [[{ quantidade: 10 }]];
      }
      if (sql.startsWith('UPDATE')) {
        chamadas.push('update');
        assert.deepEqual(parametros, [15, 1]);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT')) {
        chamadas.push('insert');
        assert.deepEqual(parametros, ['entrada', 5, 1]);
        return [{ insertId: 9 }];
      }
      throw new Error('SQL inesperado');
    },
    commit: async () => { chamadas.push('commit'); },
    rollback: async () => { chamadas.push('rollback'); },
    release: () => { chamadas.push('release'); }
  };
  await comServidor({ getConnection: async () => conexao }, async base => {
    const resposta = await requisitar(base, '/produtos/1/entrada', { method: 'POST', body: { quantidade: 5 } });
    assert.equal(resposta.status, 201);
    assert.equal(resposta.corpo.quantidade_atual, 15);
    assert.deepEqual(chamadas, ['begin', 'select', 'update', 'insert', 'commit', 'release']);
  });
});

test('recusa saída acima do estoque e desfaz a transação', async () => {
  const chamadas = [];
  const conexao = {
    beginTransaction: async () => { chamadas.push('begin'); },
    execute: async sql => {
      assert.match(sql, /FOR UPDATE/);
      chamadas.push('select');
      return [[{ quantidade: 3 }]];
    },
    commit: async () => { chamadas.push('commit'); },
    rollback: async () => { chamadas.push('rollback'); },
    release: () => { chamadas.push('release'); }
  };
  await comServidor({ getConnection: async () => conexao }, async base => {
    const resposta = await requisitar(base, '/produtos/1/saida', { method: 'POST', body: { quantidade: 4 } });
    assert.equal(resposta.status, 409);
    assert.deepEqual(chamadas, ['begin', 'select', 'rollback', 'release']);
  });
});
