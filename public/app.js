const state = { products: [], stock: [], limits: [], categoryValues: [] };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR');

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.');
  return data;
}

function toast(message, error = false) {
  const el = $('#toast'); el.textContent = message; el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.className = 'toast', 3200);
}

function productCell(product) {
  const initial = product.nome.trim().charAt(0).toUpperCase();
  return `<div class="product-cell"><span class="product-avatar">${initial}</span><span>${escapeHtml(product.nome)}</span></div>`;
}
function escapeHtml(value) { const el = document.createElement('div'); el.textContent = value ?? ''; return el.innerHTML; }
function statusTag(qty) { return qty === 0 ? '<span class="tag empty">Sem estoque</span>' : '<span class="tag">Disponível</span>'; }

async function loadAll() {
  try {
    const [products, stock, limits, categoryValues] = await Promise.all([
      api('/produtos'), api('/produtos/estoque'), api('/produtos/limites'), api('/produtos/valor-total-categoria')
    ]);
    Object.assign(state, { products, stock, limits, categoryValues });
    renderDashboard(); renderProducts(); renderValueReport();
  } catch (error) { toast(error.message, true); renderOffline(); }
}

function renderDashboard() {
  const totalUnits = state.products.reduce((sum, p) => sum + Number(p.quantidade), 0);
  const totalValue = state.stock.reduce((sum, p) => sum + Number(p.valor_total), 0);
  const categories = new Set(state.products.map(p => p.categoria));
  $('#metricProducts').textContent = number.format(state.products.length);
  $('#metricCategories').textContent = `${categories.size} ${categories.size === 1 ? 'categoria' : 'categorias'}`;
  $('#metricUnits').textContent = number.format(totalUnits);
  $('#metricValue').textContent = money.format(totalValue);
  $('#metricEmpty').textContent = number.format(state.products.filter(p => Number(p.quantidade) === 0).length);
  const max = Math.max(...state.categoryValues.map(x => Number(x.valor_total_categoria)), 1);
  $('#categoryChart').innerHTML = state.categoryValues.length ? state.categoryValues.slice(0, 5).map(row => `<div class="bar-row"><span>${escapeHtml(row.categoria)}</span><div class="bar-track"><div class="bar-fill" style="width:${Number(row.valor_total_categoria) / max * 100}%"></div></div><strong>${money.format(row.valor_total_categoria)}</strong></div>`).join('') : '<div class="empty">Nenhuma categoria cadastrada.</div>';
  $('#limitCount').textContent = state.limits.length;
  $('#limitList').innerHTML = state.limits.length ? state.limits.slice(0, 5).map(item => `<div class="limit-item"><div><strong>${escapeHtml(item.nome)}</strong><small>${item.quantidade === 0 ? 'Reposição necessária' : 'Estoque elevado'}</small></div><span class="${item.quantidade === 0 ? 'stock-zero' : 'stock-max'}">${number.format(item.quantidade)} un.</span></div>`).join('') : '<div class="empty">Tudo certo por aqui.</div>';
  $('#recentProducts').innerHTML = state.products.slice(-5).reverse().map(p => `<tr><td>${productCell(p)}</td><td>${escapeHtml(p.categoria)}</td><td>${money.format(p.valor)}</td><td>${number.format(p.quantidade)} ${escapeHtml(p.unidade_medida)}</td><td>${statusTag(Number(p.quantidade))}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Cadastre seu primeiro produto.</td></tr>';
}

function renderProducts() {
  const query = $('#globalSearch').value.trim().toLowerCase(); const category = $('#categoryFilter').value;
  const filtered = state.products.filter(p => (!query || `${p.nome} ${p.categoria}`.toLowerCase().includes(query)) && (!category || p.categoria === category));
  $('#productsTable').innerHTML = filtered.map(p => `<tr><td>${productCell(p)}</td><td>${escapeHtml(p.categoria)}</td><td>${money.format(p.valor)}</td><td>${number.format(p.quantidade)} ${escapeHtml(p.unidade_medida)}</td><td>${statusTag(Number(p.quantidade))}</td><td class="actions"><button class="action-btn" data-move="entrada" data-id="${p.id}" title="Registrar entrada">＋</button><button class="action-btn" data-move="saida" data-id="${p.id}" title="Registrar saída">−</button><button class="action-btn" data-edit="${p.id}" title="Editar">✎</button><button class="action-btn danger" data-delete="${p.id}" title="Excluir">×</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>';
  $('#productCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'produto exibido' : 'produtos exibidos'}`;
  const current = $('#categoryFilter').value;
  const categories = [...new Set(state.products.map(p => p.categoria))].sort();
  $('#categoryFilter').innerHTML = '<option value="">Todas</option>' + categories.map(c => `<option ${c === current ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function renderValueReport() {
  const max = Math.max(...state.categoryValues.map(x => Number(x.valor_total_categoria)), 1);
  $('#valueReport').innerHTML = state.categoryValues.map(x => `<div class="report-item"><div><strong>${escapeHtml(x.categoria)}</strong><div class="progress"><span style="width:${Number(x.valor_total_categoria) / max * 100}%"></span></div></div><strong>${money.format(x.valor_total_categoria)}</strong></div>`).join('') || '<div class="empty">Sem dados.</div>';
}

function renderOffline() {
  ['#categoryChart','#limitList','#recentProducts','#productsTable','#valueReport'].forEach(id => { const el = $(id); if (el) el.innerHTML = '<div class="empty">Não foi possível carregar os dados. Verifique o banco de dados.</div>'; });
}

function switchView(view) {
  $$('.view').forEach(el => el.classList.toggle('active', el.id === `${view}View`));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#pageTitle').textContent = { dashboard: 'Visão geral', products: 'Produtos', reports: 'Relatórios' }[view];
  $('.sidebar').classList.remove('open');
}

function openProduct(product = null) {
  $('#productDialogTitle').textContent = product ? 'Editar produto' : 'Novo produto';
  $('#productId').value = product?.id || ''; $('#productName').value = product?.nome || '';
  $('#productCategory').value = product?.categoria || ''; $('#productUnit').value = product?.unidade_medida || 'unidade';
  $('#productValue').value = product?.valor ?? ''; $('#productQuantity').value = product?.quantidade ?? '';
  $('#productDialog').showModal(); setTimeout(() => $('#productName').focus(), 50);
}

$('#productForm').addEventListener('submit', async event => {
  event.preventDefault(); const id = $('#productId').value;
  const body = { nome: $('#productName').value, categoria: $('#productCategory').value, unidade_medida: $('#productUnit').value, valor: Number($('#productValue').value), quantidade: Number($('#productQuantity').value) };
  try { await api(id ? `/produtos/${id}` : '/produtos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }); $('#productDialog').close(); toast(id ? 'Produto atualizado.' : 'Produto cadastrado.'); await loadAll(); } catch (error) { toast(error.message, true); }
});

function openMovement(id, type) {
  const product = state.products.find(p => String(p.id) === String(id)); if (!product) return;
  $('#movementProductId').value = id; $('#movementType').value = type; $('#movementQuantity').value = '';
  $('#movementTitle').textContent = `Registrar ${type}`; $('#movementProduct').innerHTML = `${escapeHtml(product.nome)} <small>Estoque atual: ${number.format(product.quantidade)} ${escapeHtml(product.unidade_medida)}</small>`;
  $('#movementSubmit').textContent = type === 'entrada' ? 'Confirmar entrada' : 'Confirmar saída'; $('#movementDialog').showModal();
}

$('#movementForm').addEventListener('submit', async event => {
  event.preventDefault(); const id = $('#movementProductId').value; const type = $('#movementType').value;
  try { const result = await api(`/produtos/${id}/${type}`, { method: 'POST', body: JSON.stringify({ quantidade: Number($('#movementQuantity').value) }) }); $('#movementDialog').close(); toast(result.mensagem); await loadAll(); } catch (error) { toast(error.message, true); }
});

async function loadReports() {
  const dataInicial = $('#dateStart').value; const dataFinal = $('#dateEnd').value;
  if (!dataInicial || !dataFinal) return toast('Selecione as duas datas.', true);
  const query = `?dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
  try {
    const [moves, outflows] = await Promise.all([api(`/produtos/movimentacoes-periodo${query}`), api(`/produtos/maior-saida${query}`)]);
    $('#movementReport').innerHTML = moves.map(x => `<tr><td><strong>${escapeHtml(x.nome_produto)}</strong></td><td class="stock-max">+ ${number.format(x.total_entradas)}</td><td class="stock-zero">− ${number.format(x.total_saidas)}</td><td>${number.format(x.saldo_periodo)}</td><td>${money.format(x.valor_total_financeiro_saidas)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Sem dados no período.</td></tr>';
    const max = Math.max(...outflows.map(x => Number(x.quantidade_total_saida)), 1);
    $('#outflowReport').innerHTML = outflows.slice(0, 7).map(x => `<div class="report-item"><div><strong>${escapeHtml(x.nome_produto)}</strong><div class="progress"><span style="width:${Number(x.quantidade_total_saida) / max * 100}%"></span></div></div><div><strong>${number.format(x.quantidade_total_saida)} un.</strong><small>${money.format(x.valor_total_financeiro_saidas)}</small></div></div>`).join('') || '<div class="empty">Sem saídas no período.</div>';
  } catch (error) { toast(error.message, true); }
}

$$('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
$$('[data-go]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.go)));
$('#newProduct').addEventListener('click', () => openProduct());
$('#globalSearch').addEventListener('input', () => { renderProducts(); if ($('#globalSearch').value) switchView('products'); });
$('#categoryFilter').addEventListener('change', renderProducts);
$('#loadReport').addEventListener('click', loadReports);
$('#menuButton').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
$('#productsTable').addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit]'); const move = event.target.closest('[data-move]'); const del = event.target.closest('[data-delete]');
  if (edit) openProduct(state.products.find(p => String(p.id) === edit.dataset.edit));
  if (move) openMovement(move.dataset.id, move.dataset.move);
  if (del) { const p = state.products.find(x => String(x.id) === del.dataset.delete); if (confirm(`Excluir “${p.nome}”? Esta ação não pode ser desfeita.`)) try { await api(`/produtos/${p.id}`, { method: 'DELETE' }); toast('Produto excluído.'); await loadAll(); } catch (error) { toast(error.message, true); } }
});
const today = new Date(); const first = new Date(today.getFullYear(), today.getMonth(), 1); const iso = d => d.toISOString().slice(0, 10);
$('#dateStart').value = iso(first); $('#dateEnd').value = iso(today);
loadAll(); loadReports();
