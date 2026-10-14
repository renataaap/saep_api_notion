const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarId,
  validarQuantidade,
  validarProduto,
  validarPeriodo
} = require('../src/utils/validacao');

test('aceita IDs positivos dentro do limite SQL', () => {
  assert.equal(validarId('1'), 1);
  assert.equal(validarId('2147483647'), 2147483647);
  for (const id of ['0', '-1', '1abc', '1.2', '2147483648']) {
    assert.equal(validarId(id), null);
  }
});

test('valida quantidade inteira e não negativa no cadastro', () => {
  assert.equal(validarQuantidade(0, true), true);
  assert.equal(validarQuantidade(3), true);
  assert.equal(validarQuantidade(0), false);
  assert.equal(validarQuantidade(-1, true), false);
  assert.equal(validarQuantidade(1.5), false);
  assert.equal(validarQuantidade('2'), false);
});

test('aceita produto válido com quantidade zero e unidade opcional', () => {
  const resultado = validarProduto({ nome: ' Teclado ', valor: 150.25, quantidade: 0, categoria: ' Periféricos ' });
  assert.equal(resultado.erro, undefined);
  assert.equal(resultado.dados.nome, 'Teclado');
  assert.equal(resultado.dados.categoria, 'Periféricos');
  assert.equal(resultado.dados.quantidade, 0);
  assert.equal(resultado.dados.unidade_medida, undefined);
});

test('rejeita preço com casas decimais extras e campos inválidos', () => {
  assert.ok(validarProduto({ nome: 'A', valor: 1.234, quantidade: 1, categoria: 'C' }).erro);
  assert.ok(validarProduto({ nome: 'A', valor: -1, quantidade: 1, categoria: 'C' }).erro);
  assert.ok(validarProduto({ nome: '', valor: 1, quantidade: 1, categoria: 'C' }).erro);
  assert.ok(validarProduto({ nome: 'A', valor: 1, quantidade: 1, categoria: 'C', unidade_medida: '' }).erro);
  assert.ok(validarProduto(null).erro);
});

test('rejeita datas impossíveis, falta de período e ordem invertida', () => {
  assert.deepEqual(validarPeriodo({ dataInicial: '2026-06-01', dataFinal: '2026-06-30' }), {
    dataInicial: '2026-06-01', dataFinal: '2026-06-30'
  });
  assert.ok(validarPeriodo({}).erro);
  assert.ok(validarPeriodo({ dataInicial: '2026-02-30', dataFinal: '2026-06-30' }).erro);
  assert.ok(validarPeriodo({ dataInicial: '2026-07-01', dataFinal: '2026-06-30' }).erro);
  assert.ok(validarPeriodo({ dataInicial: '2026-06-01 OR 1=1', dataFinal: '2026-06-30' }).erro);
});
