function validarId(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function validarTexto(valor, maximo) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  return texto.length > 0 && texto.length <= maximo ? texto : null;
}

function validarQuantidade(valor, permitirZero = false) {
  if (!Number.isInteger(valor) || valor > 2147483647) return false;
  return permitirZero ? valor >= 0 : valor > 0;
}

function validarValor(valor) {
  return typeof valor === 'number'
    && Number.isFinite(valor)
    && valor >= 0
    && valor <= 99999999.99
    && Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001;
}

function validarProduto(body, exigirUnidade = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { erro: 'Informe os dados do produto em JSON.' };
  }

  const nome = validarTexto(body.nome, 100);
  const categoria = validarTexto(body.categoria, 50);
  const unidade = body.unidade_medida === undefined && !exigirUnidade
    ? undefined
    : validarTexto(body.unidade_medida, 20);

  if (!nome || !categoria || !validarValor(body.valor)
    || !validarQuantidade(body.quantidade, true)
    || unidade === null) {
    return { erro: 'Informe nome, valor (maior ou igual a zero, com até duas casas decimais), quantidade (inteiro não negativo), categoria e uma unidade de medida válida.' };
  }

  return {
    dados: {
      nome,
      valor: body.valor,
      quantidade: body.quantidade,
      categoria,
      unidade_medida: unidade
    }
  };
}

function validarData(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (ano < 1000 || ano > 9999 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano
    && data.getUTCMonth() === mes - 1
    && data.getUTCDate() === dia;
}

function validarPeriodo(query) {
  const { dataInicial, dataFinal } = query;
  if (!validarData(dataInicial) || !validarData(dataFinal) || dataInicial > dataFinal) {
    return { erro: 'Informe dataInicial e dataFinal válidas (AAAA-MM-DD), com dataInicial menor ou igual a dataFinal.' };
  }
  return { dataInicial, dataFinal };
}

module.exports = {
  validarId,
  validarQuantidade,
  validarProduto,
  validarPeriodo
};
