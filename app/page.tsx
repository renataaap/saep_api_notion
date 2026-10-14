'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Product = { id: number; nome: string; valor: number; quantidade: number; categoria: string; unidade_medida: string };
type Stock = Product & { valor_total: number };
type CategoryValue = { categoria: string; valor_total_categoria: number };
type Limit = { id: number; nome: string; quantidade: number; status_limite: string };
type Movement = { nome_produto: string; total_entradas: number; total_saidas: number; saldo_periodo: number; valor_total_financeiro_saidas: number };
type Outflow = { nome_produto: string; quantidade_total_saida: number; valor_total_financeiro_saidas: number };
type Tab = 'resumo' | 'produtos' | 'relatorios';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const quantity = new Intl.NumberFormat('pt-BR');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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

const tabCopy: Record<Tab, { title: string; description: string }> = {
  resumo: { title: 'Visão geral', description: 'Uma leitura rápida da operação e dos pontos que pedem atenção.' },
  produtos: { title: 'Produtos', description: 'Consulte o catálogo e registre entradas, saídas ou ajustes.' },
  relatorios: { title: 'Relatórios', description: 'Acompanhe o valor armazenado e o fluxo em cada período.' }
};

export default function Home() {
  const [tab, setTab] = useState<Tab>('resumo');
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [categories, setCategories] = useState<CategoryValue[]>([]);
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
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, s, l, c] = await Promise.all([
        request<Product[]>('/produtos'), request<Stock[]>('/produtos/estoque'),
        request<Limit[]>('/produtos/limites'), request<CategoryValue[]>('/produtos/valor-total-categoria')
      ]);
      setProducts(p); setStock(s); setLimits(l); setCategories(c);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar o estoque.'); }
    finally { setLoading(false); }
  }, []);

  const loadReports = useCallback(async () => {
    setReportLoading(true); setError('');
    try {
      const query = `?dataInicial=${startDate}&dataFinal=${endDate}`;
      const [m, o] = await Promise.all([
        request<Movement[]>(`/produtos/movimentacoes-periodo${query}`),
        request<Outflow[]>(`/produtos/maior-saida${query}`)
      ]);
      setMovements(m); setOutflows(o);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar os relatórios.'); }
    finally { setReportLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (tab === 'relatorios' && movements.length === 0) loadReports(); }, [tab, loadReports, movements.length]);

  const categoryNames = useMemo(() => [...new Set(products.map(product => product.categoria))].sort(), [products]);
  const filtered = useMemo(() => products.filter(product => {
    const text = `${product.nome} ${product.categoria}`.toLocaleLowerCase('pt-BR');
    return (!search || text.includes(search.toLocaleLowerCase('pt-BR'))) && (!category || product.categoria === category);
  }), [products, search, category]);

  function notify(text: string) {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(''), 3500);
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Excluir “${product.nome}”? Produtos com movimentações não podem ser excluídos.`)) return;
    try { await request(`/produtos/${product.id}`, { method: 'DELETE' }); notify('Produto excluído.'); await loadData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível excluir o produto.'); }
  }

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalUnits = products.reduce((sum, product) => sum + Number(product.quantidade), 0);
  const totalValue = stock.reduce((sum, product) => sum + Number(product.valor_total), 0);
  const emptyCount = products.filter(product => Number(product.quantidade) === 0).length;

  return <div className="shell">
    <header className="site-header">
      <div className="header-main wrap">
        <button className="brand" onClick={() => changeTab('resumo')} aria-label="Ir para a visão geral">
          <span className="brand-stamp">ES</span>
          <span><strong>Estoque SAEP</strong><small>Controle operacional</small></span>
        </button>
        <button className="button button-primary" onClick={() => setEditing(null)}>Cadastrar produto</button>
      </div>
      <div className="nav-shell">
        <div className="wrap nav-row">
          <nav aria-label="Navegação principal">
            {(['resumo', 'produtos', 'relatorios'] as Tab[]).map(item =>
              <button key={item} aria-current={tab === item ? 'page' : undefined} className={tab === item ? 'active' : ''} onClick={() => changeTab(item)}>{item === 'resumo' ? 'Resumo' : item === 'produtos' ? 'Produtos' : 'Relatórios'}</button>
            )}
          </nav>
          <label className="search-field"><span>Buscar</span><input value={search} onChange={event => { setSearch(event.target.value); if (event.target.value) setTab('produtos'); }} placeholder="Nome ou categoria" /></label>
        </div>
      </div>
    </header>

    <main className="wrap main-content">
      <div className="page-heading">
        <div><p className="section-label">PAINEL DE ESTOQUE</p><h1>{tabCopy[tab].title}</h1><p>{tabCopy[tab].description}</p></div>
        {tab === 'produtos' && <button className="button button-primary desktop-action" onClick={() => setEditing(null)}>Cadastrar produto</button>}
      </div>

      {error && <div className="alert" role="alert"><div><strong>Algo não saiu como esperado.</strong><span>{error}</span></div><div><button onClick={loadData}>Tentar novamente</button><button className="alert-close" aria-label="Fechar aviso" onClick={() => setError('')}>×</button></div></div>}

      {loading ? <LoadingState /> : <>
        {tab === 'resumo' && <>
          <section className="summary-strip" aria-label="Resumo do estoque">
            <Metric index="01" label="Produtos cadastrados" value={quantity.format(products.length)} detail={`${categoryNames.length} ${categoryNames.length === 1 ? 'categoria' : 'categorias'}`} />
            <Metric index="02" label="Unidades disponíveis" value={quantity.format(totalUnits)} detail="Somadas no estoque" />
            <Metric index="03" label="Valor armazenado" value={currency.format(totalValue)} detail="Posição atual" />
            <Metric index="04" label="Sem estoque" value={quantity.format(emptyCount)} detail={emptyCount ? 'Reposição necessária' : 'Nenhuma pendência'} warning={emptyCount > 0} />
          </section>

          <section className="overview-grid">
            <div className="content-section">
              <SectionHeading eyebrow="PATRIMÔNIO" title="Valor por categoria" action="Abrir relatórios" onAction={() => changeTab('relatorios')} />
              <CategoryList categories={categories} />
            </div>
            <aside className="attention-panel">
              <div className="attention-heading"><div><p className="section-label">PONTOS DE ATENÇÃO</p><h2>Limites de estoque</h2></div><span>{limits.length}</span></div>
              {limits.length ? <div className="attention-list">{limits.slice(0, 6).map(item => <div className="attention-row" key={item.id}><div><strong>{item.nome}</strong><small>{item.quantidade === 0 ? 'Estoque zerado' : 'Acima do limite de 100'}</small></div><b className={item.quantidade === 0 ? 'critical' : ''}>{quantity.format(item.quantidade)} un.</b></div>)}</div> : <EmptyState title="Nenhum limite atingido" text="Os níveis do estoque estão dentro da faixa acompanhada." />}
            </aside>
          </section>

          <section className="content-section products-preview">
            <SectionHeading eyebrow="CATÁLOGO" title="Últimos produtos cadastrados" action="Ver todos os produtos" onAction={() => changeTab('produtos')} />
            <ProductTable products={products.slice(-5).reverse()} compact />
          </section>
        </>}

        {tab === 'produtos' && <section className="content-section catalog-section">
          <div className="catalog-tools">
            <div><strong>{quantity.format(filtered.length)}</strong><span>{filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}</span></div>
            <label>Filtrar por categoria<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categoryNames.map(name => <option key={name}>{name}</option>)}</select></label>
          </div>
          <ProductTable products={filtered} onEdit={setEditing} onMove={(product, type) => setMoving({ product, type })} onDelete={removeProduct} />
        </section>}

        {tab === 'relatorios' && <>
          <section className="report-toolbar" aria-label="Filtro do relatório">
            <div><strong>Período analisado</strong><span>As movimentações consideram as datas registradas no estoque.</span></div>
            <div className="date-controls"><label>Data inicial<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label>Data final<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label><button className="button button-primary" onClick={loadReports} disabled={reportLoading}>{reportLoading ? 'Atualizando…' : 'Atualizar relatório'}</button></div>
          </section>
          {reportLoading ? <LoadingState compact /> : <>
            <section className="overview-grid reports-grid">
              <div className="content-section"><SectionHeading eyebrow="PATRIMÔNIO" title="Valor por categoria" /><CategoryList categories={categories} /></div>
              <div className="content-section"><SectionHeading eyebrow="GIRO" title="Produtos com mais saídas" />{outflows.length ? <div className="rank-list">{outflows.slice(0, 6).map((item, index) => <div className="rank-row" key={item.nome_produto}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.nome_produto}</strong><small>{currency.format(item.valor_total_financeiro_saidas)} movimentados</small></div><b>{quantity.format(item.quantidade_total_saida)} un.</b></div>)}</div> : <EmptyState title="Sem saídas no período" text="Altere o intervalo ou registre uma saída para gerar este ranking." />}</div>
            </section>
            <section className="content-section"><SectionHeading eyebrow="MOVIMENTAÇÃO" title="Entradas e saídas por produto" /><MovementTable movements={movements} /></section>
          </>}
        </>}
      </>}
    </main>

    {editing !== undefined && <ProductModal product={editing} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); notify(editing ? 'Produto atualizado.' : 'Produto cadastrado.'); await loadData(); }} onError={setError} />}
    {moving && <MovementModal {...moving} onClose={() => setMoving(null)} onSaved={async () => { setMoving(null); notify(`${moving.type === 'entrada' ? 'Entrada' : 'Saída'} registrada.`); await loadData(); }} onError={setError} />}
    {message && <div className="toast" role="status"><span>✓</span>{message}</div>}
  </div>;
}

function Metric({ index, label, value, detail, warning }: { index: string; label: string; value: string; detail: string; warning?: boolean }) {
  return <article className="metric"><span className="metric-index">{index}</span><div><span>{label}</span><strong className={warning ? 'critical' : ''}>{value}</strong><small>{detail}</small></div></article>;
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div><p className="section-label">{eyebrow}</p><h2>{title}</h2></div>{action && <button onClick={onAction}>{action} →</button>}</div>;
}

function CategoryList({ categories }: { categories: CategoryValue[] }) {
  const maximum = Math.max(...categories.map(item => Number(item.valor_total_categoria)), 1);
  if (!categories.length) return <EmptyState title="Nenhuma categoria cadastrada" text="Os valores aparecerão aqui após o primeiro cadastro." />;
  return <div className="category-list">{categories.slice(0, 7).map(item => <div className="category-row" key={item.categoria}><div><strong>{item.categoria}</strong><span>{currency.format(item.valor_total_categoria)}</span></div><div className="bar" aria-label={`${item.categoria}: ${currency.format(item.valor_total_categoria)}`}><i style={{ width: `${Number(item.valor_total_categoria) / maximum * 100}%` }} /></div></div>)}</div>;
}

function ProductTable({ products, compact, onEdit, onMove, onDelete }: { products: Product[]; compact?: boolean; onEdit?: (product: Product) => void; onMove?: (product: Product, type: 'entrada' | 'saida') => void; onDelete?: (product: Product) => void }) {
  if (!products.length) return <EmptyState title="Nenhum produto encontrado" text="Ajuste os filtros ou cadastre um novo produto." />;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Produto</th><th>Categoria</th><th className="number-cell">Preço</th><th className="number-cell">Quantidade</th><th>Situação</th>{!compact && <th className="action-cell">Ações</th>}</tr></thead><tbody>{products.map(product => <tr key={product.id}><td data-label="Produto"><div className="product-name"><span>{product.nome.charAt(0).toUpperCase()}</span><strong>{product.nome}</strong></div></td><td data-label="Categoria">{product.categoria}</td><td data-label="Preço" className="number-cell">{currency.format(product.valor)}</td><td data-label="Quantidade" className="number-cell"><strong>{quantity.format(product.quantidade)}</strong> <small>{product.unidade_medida}</small></td><td data-label="Situação"><span className={product.quantidade ? 'status' : 'status status-empty'}><i />{product.quantidade ? 'Disponível' : 'Sem estoque'}</span></td>{!compact && <td data-label="Ações" className="action-cell"><div className="row-actions"><button className="move-in" onClick={() => onMove?.(product, 'entrada')}>Entrada</button><button onClick={() => onMove?.(product, 'saida')}>Saída</button><button onClick={() => onEdit?.(product)}>Editar</button><button className="delete" onClick={() => onDelete?.(product)}>Excluir</button></div></td>}</tr>)}</tbody></table></div>;
}

function MovementTable({ movements }: { movements: Movement[] }) {
  if (!movements.length) return <EmptyState title="Nenhuma movimentação no período" text="Altere as datas para consultar outro intervalo." />;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Produto</th><th className="number-cell">Entradas</th><th className="number-cell">Saídas</th><th className="number-cell">Saldo</th><th className="number-cell">Valor das saídas</th></tr></thead><tbody>{movements.map(item => <tr key={item.nome_produto}><td data-label="Produto"><strong>{item.nome_produto}</strong></td><td data-label="Entradas" className="number-cell positive">+ {quantity.format(item.total_entradas)}</td><td data-label="Saídas" className="number-cell negative">− {quantity.format(item.total_saidas)}</td><td data-label="Saldo" className="number-cell">{quantity.format(item.saldo_periodo)}</td><td data-label="Valor das saídas" className="number-cell">{currency.format(item.valor_total_financeiro_saidas)}</td></tr>)}</tbody></table></div>;
}

function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>—</span><strong>{title}</strong><p>{text}</p></div>; }
function LoadingState({ compact }: { compact?: boolean }) { return <div className={`loading-state${compact ? ' compact' : ''}`} aria-live="polite"><span /><div><strong>Atualizando estoque</strong><small>Buscando os dados mais recentes…</small></div></div>; }

function ProductModal({ product, onClose, onSaved, onError }: { product: Product | null; onClose: () => void; onSaved: () => void | Promise<void>; onError: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    const body = { nome: form.get('nome'), categoria: form.get('categoria'), unidade_medida: form.get('unidade'), valor: Number(form.get('valor')), quantidade: Number(form.get('quantidade')) };
    try { await request(product ? `/produtos/${product.id}` : '/produtos', { method: product ? 'PUT' : 'POST', body: JSON.stringify(body) }); await onSaved(); }
    catch (err) { onError(err instanceof Error ? err.message : 'Não foi possível salvar o produto.'); setSaving(false); }
  }
  return <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div className="modal-heading"><div><p className="section-label">{product ? 'EDIÇÃO' : 'NOVO CADASTRO'}</p><h2 id="product-modal-title">{product ? 'Editar produto' : 'Cadastrar produto'}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}>×</button></div><form onSubmit={submit}><label className="field full">Nome do produto<input name="nome" defaultValue={product?.nome} maxLength={100} autoFocus required placeholder="Ex.: Cabo USB-C" /></label><div className="form-grid"><label className="field">Categoria<input name="categoria" defaultValue={product?.categoria} maxLength={50} required placeholder="Ex.: Acessórios" /></label><label className="field">Unidade de medida<select name="unidade" defaultValue={product?.unidade_medida || 'unidade'}><option value="unidade">Unidade</option><option value="caixa">Caixa</option><option value="kg">Quilograma</option><option value="litro">Litro</option><option value="metro">Metro</option></select></label><label className="field">Valor unitário<input name="valor" type="number" step="0.01" min="0" max="99999999.99" defaultValue={product?.valor} required placeholder="0,00" /></label><label className="field">Quantidade<input name="quantidade" type="number" min="0" max="2147483647" defaultValue={product?.quantidade} required placeholder="0" /></label></div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando…' : product ? 'Salvar alterações' : 'Cadastrar produto'}</button></div></form></section></div>;
}

function MovementModal({ product, type, onClose, onSaved, onError }: { product: Product; type: 'entrada' | 'saida'; onClose: () => void; onSaved: () => void | Promise<void>; onError: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const amount = Number(new FormData(event.currentTarget).get('quantidade'));
    try { await request(`/produtos/${product.id}/${type}`, { method: 'POST', body: JSON.stringify({ quantidade: amount }) }); await onSaved(); }
    catch (err) { onError(err instanceof Error ? err.message : 'Não foi possível registrar a movimentação.'); setSaving(false); }
  }
  return <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="movement-modal-title"><div className="modal-heading"><div><p className="section-label">MOVIMENTAÇÃO</p><h2 id="movement-modal-title">Registrar {type}</h2></div><button type="button" aria-label="Fechar" onClick={onClose}>×</button></div><div className="selected-product"><span>{product.nome.charAt(0).toUpperCase()}</span><div><strong>{product.nome}</strong><small>Saldo atual: {quantity.format(product.quantidade)} {product.unidade_medida}</small></div></div><form onSubmit={submit}><label className="field full">Quantidade da {type}<input name="quantidade" type="number" min="1" max="2147483647" required autoFocus /></label>{type === 'saida' && <p className="form-note">A saída não pode ultrapassar o saldo atual.</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button className={`button ${type === 'saida' ? 'button-dark' : 'button-primary'}`} disabled={saving}>{saving ? 'Registrando…' : `Confirmar ${type}`}</button></div></form></section></div>;
}
