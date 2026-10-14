'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Product = { id: number; nome: string; valor: number; quantidade: number; categoria: string; unidade_medida: string };
type Stock = Product & { valor_total: number };
type Movement = { nome_produto: string; total_entradas: number; total_saidas: number; saldo_periodo: number; valor_total_financeiro_saidas: number };
type Outflow = { nome_produto: string; quantidade_total_saida: number; valor_total_financeiro_saidas: number };
type CategoryValue = { categoria: string; valor_total_categoria: number };
type Tab = 'produtos' | 'relatorios';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR');

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir a operação.');
  return data;
}

function dateValue(firstDay = false) {
  const date = new Date();
  if (firstDay) date.setDate(1);
  return new Intl.DateTimeFormat('en-CA').format(date);
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('produtos');
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [moving, setMoving] = useState<{ product: Product; type: 'entrada' | 'saida' } | null>(null);
  const [startDate, setStartDate] = useState(dateValue(true));
  const [endDate, setEndDate] = useState(dateValue());
  const [movements, setMovements] = useState<Movement[]>([]);
  const [outflows, setOutflows] = useState<Outflow[]>([]);
  const [categoryValues, setCategoryValues] = useState<CategoryValue[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [productsData, stockData] = await Promise.all([api<Product[]>('/produtos'), api<Stock[]>('/produtos/estoque')]);
      setProducts(productsData); setStock(stockData);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar os produtos.'); }
    finally { setLoading(false); }
  }, []);

  const loadReports = useCallback(async () => {
    setReportLoading(true); setError('');
    try {
      const query = `?dataInicial=${startDate}&dataFinal=${endDate}`;
      const [movementData, outflowData, categoryData] = await Promise.all([
        api<Movement[]>(`/produtos/movimentacoes-periodo${query}`),
        api<Outflow[]>(`/produtos/maior-saida${query}`),
        api<CategoryValue[]>('/produtos/valor-total-categoria')
      ]);
      setMovements(movementData); setOutflows(outflowData); setCategoryValues(categoryData);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar os relatórios.'); }
    finally { setReportLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { if (tab === 'relatorios' && !categoryValues.length) loadReports(); }, [tab, loadReports, categoryValues.length]);

  const categories = useMemo(() => [...new Set(products.map(product => product.categoria))].sort(), [products]);
  const filtered = useMemo(() => products.filter(product => {
    const text = `${product.nome} ${product.categoria}`.toLocaleLowerCase('pt-BR');
    return (!search || text.includes(search.toLocaleLowerCase('pt-BR'))) && (!category || product.categoria === category);
  }), [products, search, category]);
  const emptyCount = products.filter(product => Number(product.quantidade) === 0).length;
  const totalUnits = products.reduce((sum, product) => sum + Number(product.quantidade), 0);
  const totalValue = stock.reduce((sum, product) => sum + Number(product.valor_total), 0);

  function notify(text: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setMessage(text); toastTimer.current = setTimeout(() => setMessage(''), 3000);
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Excluir “${product.nome}”?`)) return;
    try { await api(`/produtos/${product.id}`, { method: 'DELETE' }); notify('Produto excluído.'); await loadProducts(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir o produto.'); }
  }

  return <>
    <header className="topbar">
      <div className="page-width topbar-inner">
        <button className="wordmark" onClick={() => setTab('produtos')}>Estoque SAEP</button>
        <nav aria-label="Navegação principal">
          <button className={tab === 'produtos' ? 'active' : ''} aria-current={tab === 'produtos' ? 'page' : undefined} onClick={() => setTab('produtos')}>Produtos</button>
          <button className={tab === 'relatorios' ? 'active' : ''} aria-current={tab === 'relatorios' ? 'page' : undefined} onClick={() => setTab('relatorios')}>Relatórios</button>
        </nav>
      </div>
    </header>

    <main className="page-width">
      {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Fechar">×</button></div>}

      {tab === 'produtos' ? <>
        <div className="page-title"><div><h1>Produtos</h1><p>Consulte e atualize o estoque.</p></div><button className="primary-button" onClick={() => setEditing(null)}>Adicionar produto</button></div>

        <section className="metrics" aria-label="Resumo do estoque">
          <div><span>Produtos</span><strong>{number.format(products.length)}</strong><small>{categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}</small></div>
          <div><span>Unidades em estoque</span><strong>{number.format(totalUnits)}</strong><small>Quantidade disponível</small></div>
          <div><span>Valor armazenado</span><strong>{money.format(totalValue)}</strong><small>Posição atual</small></div>
          <div className={emptyCount ? 'metric-alert' : ''}><span>Sem estoque</span><strong>{number.format(emptyCount)}</strong><small>{emptyCount ? 'Precisam de reposição' : 'Nenhuma pendência'}</small></div>
        </section>

        <section className="toolbar" aria-label="Filtros de produtos">
          <label className="search"><span className="sr-only">Buscar produto</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou categoria..." /></label>
          <label><span className="sr-only">Categoria</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
        </section>

        <p className="summary"><strong>{number.format(filtered.length)}</strong> {filtered.length === 1 ? 'produto' : 'produtos'} <span>·</span> <b>{emptyCount} sem estoque</b> <span>·</span> {money.format(totalValue)} em mercadorias</p>

        {loading ? <Loading /> : <ProductTable products={filtered} onMove={(product, type) => setMoving({ product, type })} onEdit={setEditing} onDelete={removeProduct} />}
      </> : <>
        <div className="page-title"><div><h1>Relatórios</h1><p>Movimentações e valor do estoque.</p></div></div>
        <section className="report-filter"><label>Data inicial<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label>Data final<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label><button className="primary-button" onClick={loadReports} disabled={reportLoading}>{reportLoading ? 'Carregando...' : 'Atualizar'}</button></section>
        {reportLoading ? <Loading /> : <Reports categoryValues={categoryValues} outflows={outflows} movements={movements} />}
      </>}
    </main>

    {editing !== undefined && <ProductModal product={editing} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); notify(editing ? 'Produto atualizado.' : 'Produto cadastrado.'); await loadProducts(); }} onError={setError} />}
    {moving && <MovementModal {...moving} onClose={() => setMoving(null)} onSaved={async () => { setMoving(null); notify(`${moving.type === 'entrada' ? 'Entrada' : 'Saída'} registrada.`); await loadProducts(); }} onError={setError} />}
    {message && <div className="toast" role="status">{message}</div>}
  </>;
}

function ProductTable({ products, onMove, onEdit, onDelete }: { products: Product[]; onMove: (product: Product, type: 'entrada' | 'saida') => void; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  if (!products.length) return <Empty title="Nenhum produto encontrado" text="Ajuste a busca ou adicione um produto." />;
  return <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Unidade</th><th className="numeric">Quantidade</th><th className="numeric">Preço</th><th>Status</th><th className="actions-heading">Ações</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td data-label="Produto"><strong>{product.nome}</strong></td><td data-label="Categoria">{product.categoria}</td><td data-label="Unidade">{product.unidade_medida}</td><td data-label="Quantidade" className={`numeric ${product.quantidade === 0 ? 'zero' : ''}`}>{number.format(product.quantidade)}</td><td data-label="Preço" className="numeric">{money.format(product.valor)}</td><td data-label="Status"><span className={product.quantidade ? 'status' : 'status status-empty'}>{product.quantidade ? 'Disponível' : 'Sem estoque'}</span></td><td data-label="Ações"><div className="row-actions"><button onClick={() => onMove(product, 'entrada')}>Entrada</button><button onClick={() => onMove(product, 'saida')}>Saída</button><button onClick={() => onEdit(product)}>Editar</button><button className="delete" onClick={() => onDelete(product)}>Excluir</button></div></td></tr>)}</tbody></table></div>;
}

function Reports({ categoryValues, outflows, movements }: { categoryValues: CategoryValue[]; outflows: Outflow[]; movements: Movement[] }) {
  return <div className="reports">
    <section><h2>Valor por categoria</h2>{categoryValues.length ? <div className="simple-list">{categoryValues.map(item => <div key={item.categoria}><span>{item.categoria}</span><strong>{money.format(item.valor_total_categoria)}</strong></div>)}</div> : <Empty title="Sem dados" text="Cadastre produtos para gerar este relatório." />}</section>
    <section><h2>Produtos com mais saídas</h2>{outflows.length ? <div className="simple-list">{outflows.slice(0, 8).map(item => <div key={item.nome_produto}><span>{item.nome_produto}</span><strong>{number.format(item.quantidade_total_saida)} un.</strong></div>)}</div> : <Empty title="Sem saídas no período" text="Selecione outro intervalo ou registre uma saída." />}</section>
    <section className="movement-report"><h2>Entradas e saídas</h2>{movements.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th className="numeric">Entradas</th><th className="numeric">Saídas</th><th className="numeric">Saldo</th><th className="numeric">Valor das saídas</th></tr></thead><tbody>{movements.map(item => <tr key={item.nome_produto}><td data-label="Produto"><strong>{item.nome_produto}</strong></td><td data-label="Entradas" className="numeric blue">+ {number.format(item.total_entradas)}</td><td data-label="Saídas" className="numeric zero">− {number.format(item.total_saidas)}</td><td data-label="Saldo" className="numeric">{number.format(item.saldo_periodo)}</td><td data-label="Valor das saídas" className="numeric">{money.format(item.valor_total_financeiro_saidas)}</td></tr>)}</tbody></table></div> : <Empty title="Sem movimentações" text="Não há dados no período selecionado." />}</section>
  </div>;
}

function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><strong>{title}</strong><p>{text}</p></div>; }
function Loading() { return <div className="loading" aria-live="polite"><span /> Carregando dados...</div>; }

function ProductModal({ product, onClose, onSaved, onError }: { product: Product | null; onClose: () => void; onSaved: () => void | Promise<void>; onError: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  useModal(onClose);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); const body = { nome: form.get('nome'), categoria: form.get('categoria'), unidade_medida: form.get('unidade'), valor: Number(form.get('valor')), quantidade: Number(form.get('quantidade')) }; try { await api(product ? `/produtos/${product.id}` : '/produtos', { method: product ? 'PUT' : 'POST', body: JSON.stringify(body) }); await onSaved(); } catch (err) { onError(err instanceof Error ? err.message : 'Não foi possível salvar.'); setSaving(false); } }
  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-title"><header><h2 id="product-title">{product ? 'Editar produto' : 'Adicionar produto'}</h2><button onClick={onClose} aria-label="Fechar">×</button></header><form onSubmit={submit}><label>Nome<input name="nome" defaultValue={product?.nome} autoFocus required maxLength={100} /></label><div className="form-grid"><label>Categoria<input name="categoria" defaultValue={product?.categoria} required maxLength={50} /></label><label>Unidade<select name="unidade" defaultValue={product?.unidade_medida || 'unidade'}><option>unidade</option><option>caixa</option><option>kg</option><option>litro</option><option>metro</option></select></label><label>Valor<input name="valor" type="number" step="0.01" min="0" defaultValue={product?.valor} required /></label><label>Quantidade<input name="quantidade" type="number" min="0" defaultValue={product?.quantidade} required /></label></div><footer><button type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></footer></form></section></div>;
}

function MovementModal({ product, type, onClose, onSaved, onError }: { product: Product; type: 'entrada' | 'saida'; onClose: () => void; onSaved: () => void | Promise<void>; onError: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  useModal(onClose);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); const amount = Number(new FormData(event.currentTarget).get('quantidade')); try { await api(`/produtos/${product.id}/${type}`, { method: 'POST', body: JSON.stringify({ quantidade: amount }) }); await onSaved(); } catch (err) { onError(err instanceof Error ? err.message : 'Não foi possível registrar.'); setSaving(false); } }
  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal small" role="dialog" aria-modal="true" aria-labelledby="movement-title"><header><h2 id="movement-title">Registrar {type}</h2><button onClick={onClose} aria-label="Fechar">×</button></header><form onSubmit={submit}><p className="product-summary"><strong>{product.nome}</strong><span>Estoque atual: {number.format(product.quantidade)} {product.unidade_medida}</span></p><label>Quantidade<input name="quantidade" type="number" min="1" required autoFocus /></label>{type === 'saida' && <small>A saída não pode ultrapassar o estoque atual.</small>}<footer><button type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</button></footer></form></section></div>;
}

function useModal(onClose: () => void) {
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', escape); return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', escape); }; }, [onClose]);
}
