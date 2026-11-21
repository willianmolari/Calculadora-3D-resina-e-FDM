/* ============================================================
   app.js — Interface, navegação, CRUD e integrações
   ============================================================ */
(function () {
  'use strict';

  const S = function () { return Store.state; };
  let currentView = 'dashboard';
  let currentQuoteId = null;
  let lastResult = null;
  let draft = {
    title: 'Peça impressa 3D', clientId: '', material: 'pla', grams: 100, ml: 30,
    hours: 4, quantity: 1, colors: 1, painting: 'none', setupMinutes: 15,
    finishingMinutes: 10, packaging: 2, shipping: 0, price: 0, notes: '', process: 'fdm'
  };

  /* ---------- Utilitários ---------- */
  const $ = function (id) { return document.getElementById(id); };
  const money = function (v) { return Calc.fmtBRL(v); };
  const esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  const dateBR = function (v) {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString('pt-BR'); } catch (e) { return '—'; }
  };
  const getPath = function (obj, path) {
    return path.split('.').reduce(function (acc, k) { return acc == null ? undefined : acc[k]; }, obj);
  };
  const setPath = function (obj, path, val) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce(function (acc, k) { return acc[k]; }, obj);
    target[last] = val;
  };
  const numOr = function (v, d) { const n = Number(v); return isNaN(n) ? (d || 0) : n; };

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M8 6h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2m-6 4h2m2 0h4"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2.5"/><path d="M2 10h20M17 15h2"/>',
    trend: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cloud: '<path d="M18 10h-1.3A7 7 0 0 0 5 8.1 5.5 5.5 0 0 0 6 19h12a4 4 0 0 0 0-8z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0l-1 14H6L5 6M10 11v6m4-6v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    empty: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>'
  };

  function paintIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (node) {
      const name = node.getAttribute('data-icon');
      if (!ICONS[name] || node.dataset.painted) return;
      node.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
      node.dataset.painted = '1';
    });
  }

  function toast(msg, error) {
    const root = $('toastRoot');
    const div = document.createElement('div');
    div.className = 'toast' + (error ? ' error' : '');
    div.innerHTML = '<span data-icon="' + (error ? 'alert' : 'check') + '"></span><span>' + esc(msg) + '</span>';
    root.appendChild(div);
    paintIcons(div);
    setTimeout(function () { div.remove(); }, 3400);
  }

  /* ---------- Navegação ---------- */
  const VIEWS = {
    dashboard: ['Visão geral', 'Seu negócio em números, sempre atualizado.'],
    calculator: ['Calculadora', 'Custeie e precifique suas peças com margem sobre venda.'],
    quotes: ['Orçamentos', 'Gerencie propostas enviadas e aprovadas.'],
    sales: ['Vendas', 'Receita, custo e lucro de cada pedido.'],
    products: ['Produtos', 'Catálogo de itens recorrentes.'],
    inventory: ['Estoque', 'Insumos, consumo e reposição.'],
    services: ['Serviços', 'Serviços adicionais do seu negócio.'],
    clients: ['Clientes', 'Cadastro de clientes para orçamentos.'],
    settings: ['Configurações', 'Todos os valores e parâmetros editáveis.']
  };

  function go(view) {
    if (!VIEWS[view]) return;
    currentView = view;
    document.querySelectorAll('.view').forEach(function (v) { v.classList.toggle('hidden', v.dataset.view !== view); });
    document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    $('pageTitle').textContent = VIEWS[view][0];
    $('pageSubtitle').textContent = VIEWS[view][1];
    $('sidebar').classList.remove('open');
    $('overlay').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderView();
  }

  function renderView() {
    switch (currentView) {
      case 'dashboard': renderDashboard(); break;
      case 'calculator': renderCalc(); break;
      case 'quotes': renderQuotes(); break;
      case 'sales': renderSales(); break;
      case 'products': renderProducts(); break;
      case 'inventory': renderInventory(); break;
      case 'services': renderServices(); break;
      case 'clients': renderClients(); break;
      case 'settings': renderSettings(); break;
    }
    renderCounters();
    paintIcons();
  }

  function renderCounters() {
    const st = S();
    const pend = st.quotes.filter(function (q) { return q.status === 'sent' || q.status === 'draft'; }).length;
    const low = st.stock.filter(function (i) { return numOr(i.qty, 0) <= numOr(i.min, 0); }).length;
    $('countQuotes').textContent = pend || '';
    $('countStock').textContent = low || '';
    const cloud = st.settings.cloud;
    const pill = $('syncPill');
    if (cloud.url && cloud.anonKey) {
      pill.className = 'sync-pill cloud';
      $('syncText').textContent = cloud.lastSync
        ? 'Sincronizado ' + new Date(cloud.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'Nuvem conectada';
    } else {
      pill.className = 'sync-pill';
      $('syncText').textContent = 'Salvo localmente';
    }
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const st = S();
    const sales = st.sales.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    const revenue = sales.reduce(function (a, s) { return a + numOr(s.value); }, 0);
    const cost = sales.reduce(function (a, s) { return a + numOr(s.cost); }, 0);
    const profit = revenue - cost;
    const margin = revenue ? (profit / revenue) * 100 : 0;
    const pending = st.quotes.filter(function (q) { return q.status === 'sent' || q.status === 'draft'; });
    const pendingValue = pending.reduce(function (a, q) { return a + numOr(q.result && q.result.price); }, 0);
    const lowStock = st.stock.filter(function (i) { return numOr(i.qty, 0) <= numOr(i.min, 0); });

    const kpis = [
      { label: 'Faturamento total', value: money(revenue), icon: 'wallet', foot: sales.length + ' venda(s) registrada(s)', cls: '' },
      { label: 'Lucro acumulado', value: money(profit), icon: 'trend', foot: 'Custos de ' + money(cost), cls: 'green' },
      { label: 'Margem sobre venda', value: Calc.r2(margin) + '%', icon: 'chart', foot: 'Ideal ' + st.settings.margins.ideal + '% · mínimo ' + st.settings.margins.minimum + '%', cls: 'purple' },
      { label: 'Em aberto', value: money(pendingValue), icon: 'doc', foot: pending.length + ' orçamento(s) pendente(s)', cls: 'orange' }
    ];
    $('kpis').innerHTML = kpis.map(function (k) {
      return '<div class="kpi ' + k.cls + '"><div class="kpi-top"><span class="kpi-label">' + k.label + '</span><span class="kpi-icon"><span data-icon="' + k.icon + '"></span></span></div>' +
        '<div class="kpi-value">' + k.value + '</div><div class="kpi-foot">' + esc(k.foot) + '</div></div>';
    }).join('');

    /* Gráfico 6 meses */
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
    }
    const data = months.map(function (mo) {
      const list = sales.filter(function (s) { return String(s.date || '').slice(0, 7) === mo.key; });
      return {
        label: mo.label,
        revenue: list.reduce(function (a, s) { return a + numOr(s.value); }, 0),
        profit: list.reduce(function (a, s) { return a + numOr(s.value) - numOr(s.cost); }, 0)
      };
    });
    const max = Math.max(1, ...data.map(function (d) { return d.revenue; }));
    $('chart').innerHTML = data.map(function (d) {
      return '<div class="chart-group"><div class="chart-bars">' +
        '<div class="chart-bar revenue" style="height:' + Math.max(3, (d.revenue / max) * 130) + 'px" title="Receita ' + money(d.revenue) + '"></div>' +
        '<div class="chart-bar profit" style="height:' + Math.max(3, (d.profit / max) * 130) + 'px" title="Lucro ' + money(d.profit) + '"></div>' +
        '</div><span class="chart-label">' + d.label + '</span></div>';
    }).join('');

    /* Alertas */
    const alerts = [];
    lowStock.forEach(function (item) {
      alerts.push({ icon: 'layers', title: 'Estoque baixo: ' + item.name, text: 'Restam ' + Calc.r2(item.qty) + ' ' + item.unit + ' (mínimo ' + item.min + ').', ok: false });
    });
    pending.filter(function (q) { return q.status === 'sent'; }).forEach(function (q) {
      alerts.push({ icon: 'send', title: 'Orçamento ' + q.number + ' enviado', text: 'Aguardando resposta de ' + (q.clientName || 'cliente') + '.', ok: false });
    });
    const below = st.quotes.filter(function (q) { return q.result && q.result.margin < st.settings.margins.minimum && q.status !== 'done'; });
    if (below.length) alerts.push({ icon: 'alert', title: below.length + ' orçamento(s) abaixo da margem mínima', text: 'Revise antes de enviar ao cliente.', ok: false });
    if (!st.settings.cloud.url) alerts.push({ icon: 'cloud', title: 'Banco local em uso', text: 'Configure a nuvem gratuita em Configurações para acessar de qualquer dispositivo.', ok: true });
    if (!alerts.length) alerts.push({ icon: 'check', title: 'Tudo em dia!', text: 'Nenhuma pendência no momento.', ok: true });
    $('alerts').innerHTML = alerts.slice(0, 6).map(function (a) {
      return '<div class="alert-row ' + (a.ok ? 'ok' : '') + '"><span class="alert-icon"><span data-icon="' + a.icon + '"></span></span><div><strong>' + esc(a.title) + '</strong><span>' + esc(a.text) + '</span></div></div>';
    }).join('');

    /* Últimas vendas */
    if (!sales.length) {
      $('recentSales').innerHTML = emptyState('Nenhuma venda registrada ainda.');
    } else {
      $('recentSales').innerHTML = '<table><thead><tr><th>Produto</th><th>Data</th><th class="num">Valor</th><th class="num">Lucro</th></tr></thead><tbody>' +
        sales.slice(0, 5).map(function (s) {
          const l = numOr(s.value) - numOr(s.cost);
          return '<tr><td><strong>' + esc(s.product) + '</strong><span class="sub">' + esc(s.client || '—') + '</span></td><td>' + dateBR(s.date) + '</td><td class="num">' + money(s.value) + '</td><td class="num ' + (l >= 0 ? 'positive' : 'negative') + '">' + money(l) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    /* Ranking */
    const groups = {};
    sales.forEach(function (s) {
      const k = s.product || 'Outros';
      if (!groups[k]) groups[k] = { name: k, profit: 0, qty: 0 };
      groups[k].profit += numOr(s.value) - numOr(s.cost);
      groups[k].qty += numOr(s.qty, 1);
    });
    const top = Object.values(groups).sort(function (a, b) { return b.profit - a.profit; }).slice(0, 5);
    $('topProducts').innerHTML = top.length ? top.map(function (p, i) {
      return '<div class="rank-row"><span class="rank-num">' + (i + 1) + '</span><div class="rank-info"><strong>' + esc(p.name) + '</strong><small>' + p.qty + ' unidade(s)</small></div><span class="rank-value">' + money(p.profit) + '</span></div>';
    }).join('') : emptyState('Venda produtos para ver o ranking.');
  }

  function emptyState(text) {
    return '<div class="empty-state"><span data-icon="empty"></span>' + esc(text) + '</div>';
  }

  /* ---------- Calculadora ---------- */
  function syncMaterialOptions() {
    const sel = $('inMaterial');
    const mats = S().settings.materials;
    const isResin = draft.process === 'resin';
    sel.innerHTML = isResin
      ? '<option value="resin">' + esc(mats.resin.label) + ' — ' + money(mats.resin.price) + '/L</option>'
      : ['pla', 'petg', 'tpu'].map(function (k) {
        return '<option value="' + k + '">' + esc(mats[k].label) + ' — ' + money(mats[k].price) + '/kg</option>';
      }).join('');
    if (isResin) draft.material = 'resin';
    else if (!['pla', 'petg', 'tpu'].includes(draft.material)) draft.material = 'pla';
    sel.value = draft.material;
    $('fieldWeight').classList.toggle('hidden', false);
    $('fieldColors').classList.toggle('hidden', isResin);
    document.querySelector('label[for="inWeight"]').textContent = isResin ? 'Volume de resina (ml)' : 'Peso do material (g)';
    $('weightHint').textContent = isResin ? 'Inclua suportes e a resina do tanque.' : 'Use o peso do fatiador, com suportes.';
    $('inWeight').value = isResin ? draft.ml : draft.grams;
    const paint = $('inPainting');
    paint.querySelector('option[value="simple"]').textContent = 'Simples — ' + money(S().settings.painting.simple);
    paint.querySelector('option[value="complex"]').textContent = 'Complexa — ' + money(S().settings.painting.complex);
  }

  function readCalcForm() {
    draft.title = $('inTitle').value || 'Peça impressa 3D';
    draft.clientId = $('inClient').value;
    draft.material = $('inMaterial').value;
    if (draft.process === 'resin') draft.ml = numOr($('inWeight').value, 0);
    else draft.grams = numOr($('inWeight').value, 0);
    draft.hours = numOr($('inHours').value, 0);
    draft.quantity = Math.max(1, numOr($('inQty').value, 1));
    draft.colors = Math.max(1, numOr($('inColors').value, 1));
    draft.painting = $('inPainting').value;
    draft.setupMinutes = numOr($('inSetup').value, 0);
    draft.finishingMinutes = numOr($('inFinishing').value, 0);
    draft.packaging = numOr($('inPackaging').value, 0);
    draft.shipping = numOr($('inShipping').value, 0);
    draft.price = numOr($('inPrice').value, 0);
    draft.notes = $('inNotes').value;
  }

  function renderCalc() {
    const st = S();
    const sel = $('inClient');
    const prev = sel.value;
    sel.innerHTML = '<option value="">Consumidor final</option>' + st.clients.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
    }).join('');
    sel.value = draft.clientId && st.clients.some(function (c) { return c.id === draft.clientId; }) ? draft.clientId : (prev || '');
    syncMaterialOptions();
    ['inTitle', 'inHours', 'inQty', 'inColors', 'inPainting', 'inSetup', 'inFinishing', 'inPackaging', 'inShipping', 'inPrice', 'inNotes'].forEach(function (id) {
      const key = { inTitle: 'title', inHours: 'hours', inQty: 'quantity', inColors: 'colors', inPainting: 'painting', inSetup: 'setupMinutes', inFinishing: 'finishingMinutes', inPackaging: 'packaging', inShipping: 'shipping', inPrice: 'price', inNotes: 'notes' }[id];
      $(id).value = draft[key];
    });
    document.querySelectorAll('#processSegment .seg').forEach(function (b) { b.classList.toggle('active', b.dataset.process === draft.process); });
    refreshCalc();
  }

  function refreshCalc() {
    readCalcForm();
    const st = S();
    lastResult = Calc.calculate(draft, st.settings);
    const r = lastResult;
    const market = Calc.marketCheck(r, st.settings);
    const statusText = r.status === 'danger' ? 'Abaixo do mínimo' : r.status === 'warning' ? 'Entre mínimo e ideal' : 'Meta atingida';
    const statusColor = r.status === 'danger' ? 'red' : r.status === 'warning' ? 'orange' : 'green';

    $('results').innerHTML =
      '<div class="result-hero"><div class="rh-label">PREÇO ' + (r.input.price ? 'INFORMADO' : 'SUGERIDO · ' + r.targetIdeal + '% DE LUCRO') + '</div>' +
      '<div class="rh-price">' + money(r.price) + '</div>' +
      '<div class="rh-sub">' + r.qty + 'x ' + esc(r.material) + ' · ' + Calc.r2(r.hours) + ' h · custo ' + money(r.totalCost) + '</div></div>' +

      '<div class="result-prices">' +
      '<div class="price-box ideal"><div class="pb-label"><span data-icon="sparkle"></span> Preço ideal (' + r.targetIdeal + '%)</div><div class="pb-value">' + money(r.idealPrice) + '</div><div class="pb-foot">Lucro de ' + money(r.idealPrice - r.totalCost) + '</div></div>' +
      '<div class="price-box"><div class="pb-label"><span data-icon="info"></span> Preço mínimo (' + r.targetMin + '%)</div><div class="pb-value">' + money(r.minPrice) + '</div><div class="pb-foot">Lucro de ' + money(r.minPrice - r.totalCost) + '</div></div>' +
      '</div>' +

      '<div class="card" style="margin:0"><div class="card-header"><div><h3>Margem sobre a venda</h3><p>Lucro ÷ preço de venda</p></div><span class="badge ' + statusColor + '">' + Calc.r2(r.margin) + '% · ' + statusText + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:12px"><span>Custo: <strong>' + money(r.totalCost) + '</strong></span><span>Lucro: <strong class="' + (r.profit >= 0 ? 'positive' : 'negative') + '">' + money(r.profit) + '</strong></span></div>' +
      '<div class="margin-bar"><i style="width:' + Math.min(100, Math.max(0, r.margin)) + '%"></i></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary);margin-top:5px"><span>0%</span><span>Mín. ' + r.targetMin + '%</span><span>Ideal ' + r.targetIdeal + '%</span><span>100%</span></div>' +
      (r.margin < r.targetMin ? '<div class="info-box" style="background:var(--red-soft)">Este preço dá menos que a margem mínima de ' + r.targetMin + '%. Recomenda-se cobrar ao menos <strong>' + money(r.minPrice) + '</strong>.</div>' : '') +
      '</div>' +

      '<div class="breakdown"><h4>Composição do custo</h4>' +
      r.lines.map(function (l) {
        return '<div class="break-row"><span>' + esc(l.label) + (l.note ? '<br><small style="color:var(--text-tertiary)">' + esc(l.note) + '</small>' : '') + '</span><span>' + money(l.value) + '</span></div>';
      }).join('') +
      '<div class="break-row total"><span>Custo total de produção</span><span>' + money(r.totalCost) + '</span></div>' +
      '<div style="font-size:10px;color:var(--text-tertiary);margin-top:10px">Energia: ' + r.kwh + ' kWh · ' + Calc.r2(r.hours) + ' h · hora de máquina ' + money(r.machineHourRate) + '/h' + (r.perGram !== null ? ' · ' + money(r.perGram) + '/g' : '') + '</div>' +
      '</div>' +

      '<div class="market-card"><h4>Comparativo de mercado</h4><div style="font-size:18px;font-weight:700">' + esc(market.label) + '</div>' +
      '<div class="market-scale"><span class="market-marker" style="left:' + market.position + '%"></span></div>' +
      '<div class="market-labels"><span>' + money(st.settings.market.perGramMin) + '/g</span><span>' + money(st.settings.market.perGramMax) + '/g</span></div>' +
      '<div class="market-note">' + esc(market.text) + '</div></div>';
    paintIcons($('results'));
  }

  function buildQuoteFromDraft() {
    readCalcForm();
    const st = S();
    const client = st.clients.find(function (c) { return c.id === draft.clientId; });
    const result = Calc.calculate(draft, st.settings);
    const num = st.settings.company.quotePrefix + '-' + new Date().getFullYear() + '-' + String(st.quotes.length + 1).padStart(3, '0');
    return {
      id: currentQuoteId || Store.uid('q'),
      number: (currentQuoteId && st.quotes.find(function (q) { return q.id === currentQuoteId; }) || {}).number || num,
      createdAt: new Date().toISOString(),
      status: 'draft',
      clientId: draft.clientId,
      clientName: client ? client.name : 'Consumidor final',
      input: Object.assign({}, draft),
      result: result,
      title: draft.title,
      notes: draft.notes,
      colors: draft.colors,
      grams: draft.grams,
      ml: draft.ml,
      painting: draft.painting
    };
  }

  /* ---------- Orçamentos ---------- */
  function renderQuotes() {
    const st = S();
    const filter = $('quoteFilter').value;
    const list = st.quotes.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
      .filter(function (q) { return filter === 'all' || q.status === filter; });
    if (!list.length) { $('quotesTable').innerHTML = emptyState('Nenhum orçamento encontrado. Use a calculadora para criar um.'); return; }
    const statusMap = { draft: ['Rascunho', ''], sent: ['Enviado', 'blue'], approved: ['Aprovado', 'green'], done: ['Concluído', 'purple'] };
    $('quotesTable').innerHTML = '<table><thead><tr><th>Número</th><th>Peça / cliente</th><th>Data</th><th class="num">Custo</th><th class="num">Valor</th><th class="num">Margem</th><th>Status</th><th class="num">Ações</th></tr></thead><tbody>' +
      list.map(function (q) {
        const r = q.result || {};
        const stt = statusMap[q.status] || statusMap.draft;
        return '<tr><td><strong>' + esc(q.number) + '</strong></td>' +
          '<td><strong>' + esc(q.title) + '</strong><span class="sub">' + esc(q.clientName || 'Consumidor final') + '</span></td>' +
          '<td>' + dateBR(q.createdAt) + '</td><td class="num">' + money(r.totalCost) + '</td><td class="num"><strong>' + money(r.price) + '</strong></td>' +
          '<td class="num ' + (r.margin >= st.settings.margins.minimum ? 'positive' : 'negative') + '">' + Calc.r2(r.margin || 0) + '%</td>' +
          '<td><span class="badge ' + stt[1] + '">' + stt[0] + '</span></td>' +
          '<td><div class="row-actions">' +
          '<button class="icon-action" data-action="quote-pdf" data-id="' + q.id + '" title="Gerar PDF"><span data-icon="pdf"></span></button>' +
          '<button class="icon-action" data-action="quote-edit" data-id="' + q.id + '" title="Editar"><span data-icon="edit"></span></button>' +
          (q.status !== 'done' ? '<button class="icon-action" data-action="quote-status" data-id="' + q.id + '" data-status="' + (q.status === 'draft' ? 'sent' : q.status === 'sent' ? 'approved' : 'done') + '" title="Avançar status"><span data-icon="send"></span></button>' : '') +
          '<button class="icon-action danger" data-action="quote-delete" data-id="' + q.id + '" title="Excluir"><span data-icon="trash"></span></button>' +
          '</div></td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- Vendas ---------- */
  function renderSales() {
    const st = S();
    const sales = st.sales.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    const revenue = sales.reduce(function (a, s) { return a + numOr(s.value); }, 0);
    const cost = sales.reduce(function (a, s) { return a + numOr(s.cost); }, 0);
    const profit = revenue - cost;
    const margin = revenue ? profit / revenue * 100 : 0;
    $('salesKpis').innerHTML = [
      { label: 'Receita', value: money(revenue), icon: 'wallet', foot: sales.length + ' vendas' },
      { label: 'Custo total', value: money(cost), icon: 'box', foot: 'Insumos, energia e mão de obra' },
      { label: 'Lucro', value: money(profit), icon: 'trend', foot: 'Resultado acumulado' },
      { label: 'Margem', value: Calc.r2(margin) + '%', icon: 'chart', foot: 'Lucro sobre venda' }
    ].map(function (k) {
      return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + k.label + '</span><span class="kpi-icon"><span data-icon="' + k.icon + '"></span></span></div><div class="kpi-value">' + k.value + '</div><div class="kpi-foot">' + esc(k.foot) + '</div></div>';
    }).join('');

    $('salesTable').innerHTML = sales.length ? '<table><thead><tr><th>Produto</th><th>Cliente</th><th>Data</th><th class="num">Qtd</th><th class="num">Custo</th><th class="num">Venda</th><th class="num">Lucro</th><th class="num">Margem</th><th></th></tr></thead><tbody>' +
      sales.map(function (s) {
        const l = numOr(s.value) - numOr(s.cost);
        const m = numOr(s.value) ? l / numOr(s.value) * 100 : 0;
        return '<tr><td><strong>' + esc(s.product) + '</strong></td><td>' + esc(s.client || '—') + '</td><td>' + dateBR(s.date) + '</td><td class="num">' + numOr(s.qty, 1) + '</td><td class="num">' + money(s.cost) + '</td><td class="num"><strong>' + money(s.value) + '</strong></td><td class="num ' + (l >= 0 ? 'positive' : 'negative') + '">' + money(l) + '</td><td class="num">' + Calc.r2(m) + '%</td><td><div class="row-actions"><button class="icon-action danger" data-action="sale-delete" data-id="' + s.id + '" title="Excluir"><span data-icon="trash"></span></button></div></td></tr>';
      }).join('') + '</tbody></table>' : emptyState('Nenhuma venda registrada. Conclua um orçamento ou adicione uma venda.');
  }

  /* ---------- Produtos ---------- */
  function renderProducts() {
    const list = S().products;
    $('productsTable').innerHTML = list.length ? '<table><thead><tr><th>Produto</th><th>Categoria</th><th class="num">Custo</th><th class="num">Preço</th><th class="num">Margem</th><th></th></tr></thead><tbody>' +
      list.map(function (p) {
        const m = numOr(p.price) ? (numOr(p.price) - numOr(p.cost)) / numOr(p.price) * 100 : 0;
        return '<tr><td><strong>' + esc(p.name) + '</strong><span class="sub">' + esc(p.description || '') + '</span></td><td>' + esc(p.category || '—') + '</td><td class="num">' + money(p.cost) + '</td><td class="num"><strong>' + money(p.price) + '</strong></td><td class="num ' + (m >= 40 ? 'positive' : 'negative') + '">' + Calc.r2(m) + '%</td><td><div class="row-actions"><button class="icon-action" data-action="product-edit" data-id="' + p.id + '"><span data-icon="edit"></span></button><button class="icon-action danger" data-action="product-delete" data-id="' + p.id + '"><span data-icon="trash"></span></button></div></td></tr>';
      }).join('') + '</tbody></table>' : emptyState('Cadastre produtos recorrentes para agilizar suas vendas.');
  }

  /* ---------- Estoque ---------- */
  function renderInventory() {
    const st = S();
    const total = st.stock.reduce(function (a, i) { return a + numOr(i.qty) * numOr(i.cost); }, 0);
    const low = st.stock.filter(function (i) { return numOr(i.qty) <= numOr(i.min); });
    $('stockKpis').innerHTML = [
      { label: 'Valor em estoque', value: money(total), icon: 'wallet', foot: 'Soma das quantidades x custo' },
      { label: 'Itens cadastrados', value: String(st.stock.length), icon: 'box', foot: 'Filamentos e resinas' },
      { label: 'Estoque baixo', value: String(low.length), icon: 'alert', foot: low.length ? 'Repor: ' + low.map(function (i) { return i.name; }).join(', ') : 'Tudo em ordem' }
    ].map(function (k) {
      return '<div class="kpi ' + (k.label === 'Estoque baixo' && low.length ? 'orange' : '') + '"><div class="kpi-top"><span class="kpi-label">' + k.label + '</span><span class="kpi-icon"><span data-icon="' + k.icon + '"></span></span></div><div class="kpi-value">' + k.value + '</div><div class="kpi-foot">' + esc(k.foot) + '</div></div>';
    }).join('');

    $('stockTable').innerHTML = st.stock.length ? '<table><thead><tr><th>Insumo</th><th>Marca</th><th class="num">Quantidade</th><th class="num">Mínimo</th><th class="num">Custo unit.</th><th class="num">Total</th><th></th></tr></thead><tbody>' +
      st.stock.map(function (i) {
        const isLow = numOr(i.qty) <= numOr(i.min);
        return '<tr><td><strong>' + esc(i.name) + '</strong>' + (isLow ? ' <span class="badge orange">baixo</span>' : '') + '</td><td>' + esc(i.brand || '—') + '</td><td class="num">' + Calc.r2(i.qty) + ' ' + esc(i.unit) + '</td><td class="num">' + Calc.r2(i.min) + ' ' + esc(i.unit) + '</td><td class="num">' + money(i.cost) + '</td><td class="num">' + money(numOr(i.qty) * numOr(i.cost)) + '</td><td><div class="row-actions"><button class="icon-action" data-action="stock-move" data-id="' + i.id + '" title="Entrada/saída"><span data-icon="plus"></span></button><button class="icon-action" data-action="stock-edit" data-id="' + i.id + '"><span data-icon="edit"></span></button><button class="icon-action danger" data-action="stock-delete" data-id="' + i.id + '"><span data-icon="trash"></span></button></div></td></tr>';
      }).join('') + '</tbody></table>' : emptyState('Adicione seus insumos para controlar o estoque.');

    const moves = st.movements.slice().reverse().slice(0, 12);
    $('movementsTable').innerHTML = moves.length ? '<table><thead><tr><th>Data</th><th>Insumo</th><th>Tipo</th><th class="num">Quantidade</th><th>Origem</th></tr></thead><tbody>' +
      moves.map(function (m) {
        return '<tr><td>' + dateBR(m.date) + '</td><td>' + esc(m.name) + '</td><td><span class="badge ' + (m.type === 'entrada' ? 'green' : m.type === 'saida' ? 'orange' : '') + '">' + esc(m.type) + '</span></td><td class="num">' + (m.type === 'saida' ? '−' : '+') + Calc.r2(m.qty) + ' ' + esc(m.unit) + '</td><td>' + esc(m.origin || '—') + '</td></tr>';
      }).join('') + '</tbody></table>' : emptyState('Nenhuma movimentação ainda.');
  }

  /* ---------- Serviços e clientes ---------- */
  function renderServices() {
    const list = S().services;
    $('servicesTable').innerHTML = list.length ? '<table><thead><tr><th>Serviço</th><th>Descrição</th><th class="num">Preço</th><th>Unidade</th><th></th></tr></thead><tbody>' +
      list.map(function (s) {
        return '<tr><td><strong>' + esc(s.name) + '</strong></td><td>' + esc(s.description || '—') + '</td><td class="num"><strong>' + money(s.price) + '</strong></td><td>' + esc(s.unit || 'un') + '</td><td><div class="row-actions"><button class="icon-action" data-action="service-edit" data-id="' + s.id + '"><span data-icon="edit"></span></button><button class="icon-action danger" data-action="service-delete" data-id="' + s.id + '"><span data-icon="trash"></span></button></div></td></tr>';
      }).join('') + '</tbody></table>' : emptyState('Cadastre serviços adicionais.');
  }

  function renderClients() {
    const list = S().clients;
    $('clientsTable').innerHTML = list.length ? '<table><thead><tr><th>Nome</th><th>Documento</th><th>Telefone</th><th>E-mail</th><th></th></tr></thead><tbody>' +
      list.map(function (c) {
        return '<tr><td><strong>' + esc(c.name) + '</strong></td><td>' + esc(c.document || '—') + '</td><td>' + esc(c.phone || '—') + '</td><td>' + esc(c.email || '—') + '</td><td><div class="row-actions"><button class="icon-action" data-action="client-edit" data-id="' + c.id + '"><span data-icon="edit"></span></button><button class="icon-action danger" data-action="client-delete" data-id="' + c.id + '"><span data-icon="trash"></span></button></div></td></tr>';
      }).join('') + '</tbody></table>' : emptyState('Cadastre clientes para preencher o PDF automaticamente.');
  }

  /* ---------- Configurações ---------- */
  const SETTINGS_SECTIONS = [
    {
      title: 'Empresa & orçamento', desc: 'Dados que aparecem no PDF e nas condições de venda.',
      rows: [
        ['company.name', 'Nome da empresa', 'text'], ['company.tagline', 'Slogan', 'text'],
        ['company.owner', 'Responsável', 'text'], ['company.document', 'CPF/CNPJ', 'text'],
        ['company.email', 'E-mail', 'email'], ['company.phone', 'Telefone / WhatsApp', 'text'],
        ['company.address', 'Cidade / endereço', 'text'], ['company.pix', 'Chave Pix', 'text'],
        ['company.bankInfo', 'Dados bancários', 'text'], ['company.validityDays', 'Validade do orçamento (dias)', 'number'],
        ['company.minimumOrder', 'Pedido mínimo (R$)', 'number'], ['company.quotePrefix', 'Prefixo do número', 'text']
      ]
    },
    {
      title: 'Materiais', desc: 'Preços médios informados por você. Edite livremente.',
      rows: [
        ['materials.pla.label', 'Nome do PLA', 'text'], ['materials.pla.price', 'PLA — R$/kg', 'number'],
        ['materials.petg.label', 'Nome do PET-G', 'text'], ['materials.petg.price', 'PET-G — R$/kg', 'number'],
        ['materials.tpu.label', 'Nome do TPU', 'text'], ['materials.tpu.price', 'TPU — R$/kg', 'number'],
        ['materials.resin.label', 'Nome da resina', 'text'], ['materials.resin.price', 'Resina — R$/litro', 'number'],
        ['painting.simple', 'Pintura simples (R$/peça)', 'number'], ['painting.complex', 'Pintura complexa (R$/peça)', 'number']
      ]
    },
    {
      title: 'Energia elétrica', desc: 'Curitiba é atendida pela Copel. Valor padrão com impostos (bandeira verde).',
      rows: [
        ['energy.pricePerKwh', 'R$ por kWh', 'number'], ['energy.fdmWatts', 'A1 mini · PLA (W)', 'number'],
        ['energy.petgWatts', 'A1 mini · PET-G (W)', 'number'], ['energy.tpuWatts', 'A1 mini · TPU (W)', 'number'],
        ['energy.resinWatts', 'Impressora de resina (W)', 'number'], ['energy.standbyWatts', 'Consumo em espera (W)', 'number'],
        ['energy.source', 'Fonte / observação', 'text', true]
      ]
    },
    {
      title: 'Máquinas & AMS', desc: 'Depreciação por hora, manutenção e perdas na troca de cor.',
      rows: [
        ['machines.fdmName', 'Nome da impressora FDM', 'text'], ['machines.fdmPrice', 'Valor da impressora (R$)', 'number'],
        ['machines.fdmLifespan', 'Vida útil (horas)', 'number'], ['machines.fdmMaintenance', 'Manutenção por hora (R$)', 'number'],
        ['machines.purgeGrams', 'Purga AMS por troca (g)', 'number'], ['machines.purgeMinutes', 'Tempo de purga por troca (min)', 'number'],
        ['machines.resinName', 'Nome da impressora de resina', 'text'], ['machines.resinPrice', 'Valor da impressora resina (R$)', 'number'],
        ['machines.resinLifespan', 'Vida útil resina (horas)', 'number'], ['machines.resinMaintenance', 'Manutenção resina por hora (R$)', 'number'],
        ['machines.washCureCost', 'Lavagem + cura (R$/peça)', 'number']
      ]
    },
    {
      title: 'Mão de obra, margens e mercado', desc: 'Lucro é sempre calculado sobre o preço de venda.',
      rows: [
        ['labor.hourlyRate', 'Valor da hora de trabalho (R$)', 'number'], ['labor.modelingRate', 'Modelagem 3D (R$/h)', 'number'],
        ['margins.ideal', 'Margem ideal (%)', 'number'], ['margins.minimum', 'Margem mínima (%)', 'number'],
        ['market.perGramMin', 'Mercado — mínimo R$/g', 'number'], ['market.perGramMax', 'Mercado — máximo R$/g', 'number']
      ]
    },
    {
      title: 'Perdas e encargos', desc: 'Reservas que protegem sua operação.',
      rows: [
        ['costs.waste', 'Perda de material (%)', 'number'], ['costs.failureFdm', 'Falha FDM (%)', 'number'],
        ['costs.failureResin', 'Falha resina (%)', 'number'], ['costs.platformFee', 'Taxa da plataforma (%)', 'number'],
        ['costs.extraFixed', 'Outros custos fixos (R$)', 'number']
      ]
    }
  ];

  function renderSettings() {
    const st = S();
    const sectionsHtml = SETTINGS_SECTIONS.map(function (sec) {
      return '<div class="settings-section"><h3>' + sec.title + '</h3><p>' + sec.desc + '</p>' +
        sec.rows.map(function (row) {
          const path = row[0], label = row[1], type = row[2] || 'text', wide = row[3];
          const val = getPath(st.settings, path);
          return '<div class="setting-row' + (wide ? ' wide' : '') + '"><label>' + esc(label) + '</label><input type="' + type + '" step="any" value="' + esc(val == null ? '' : val) + '" data-setting="' + path + '"></div>';
        }).join('') + '</div>';
    }).join('');

    const cloud = st.settings.cloud;
    $('settingsContent').innerHTML =
      '<div class="settings-grid"><div>' + sectionsHtml + '</div><div>' +
      '<div class="settings-section"><h3>Aparência</h3><p>Tema da interface.</p>' +
      '<div class="setting-row"><label>Tema</label><select data-setting="appearance.theme"><option value="light"' + (st.settings.appearance.theme === 'light' ? ' selected' : '') + '>Claro</option><option value="dark"' + (st.settings.appearance.theme === 'dark' ? ' selected' : '') + '>Escuro</option></select></div></div>' +

      '<div class="settings-section"><h3>Banco de dados na nuvem</h3><p>Supabase gratuito: seus dados ficam acessíveis em qualquer dispositivo.</p>' +
      '<div class="setting-row wide"><label>URL do projeto (https://xxx.supabase.co)</label><input type="text" value="' + esc(cloud.url) + '" data-setting="cloud.url" placeholder="https://....supabase.co"></div>' +
      '<div class="setting-row wide"><label>Chave pública (anon key)</label><input type="text" value="' + esc(cloud.anonKey) + '" data-setting="cloud.anonKey" placeholder="eyJ..."></div>' +
      '<div class="setting-row"><label>Sincronização automática</label><select data-setting="cloud.autoSync"><option value="false"' + (!cloud.autoSync ? ' selected' : '') + '>Desligada</option><option value="true"' + (cloud.autoSync ? ' selected' : '') + '>Ligada</option></select></div>' +
      '<div class="setting-row wide"><label>ID do workspace</label><input type="text" value="' + esc(st.workspaceId) + '" readonly></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px"><button class="btn primary small" data-action="cloud-push">Enviar para a nuvem</button><button class="btn secondary small" data-action="cloud-pull">Baixar da nuvem</button></div>' +
      '<div class="info-box"><strong>Como configurar:</strong> crie um projeto gratuito no Supabase, rode o SQL do arquivo <code>supabase/schema.sql</code> no SQL Editor e cole a URL e a chave <em>anon</em> acima. A chave anon é pública e segura para uso no navegador.</div>' +
      (cloud.lastSync ? '<div class="info-box">Última sincronização: ' + new Date(cloud.lastSync).toLocaleString('pt-BR') + '</div>' : '') +
      '</div>' +

      '<div class="settings-section"><h3>Backup & dados</h3><p>Exporte ou restaure todo o seu banco de dados.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn secondary small" data-action="export-json"><span data-icon="download"></span> Exportar JSON</button>' +
      '<button class="btn secondary small" data-action="import-json"><span data-icon="upload"></span> Importar JSON</button>' +
      '<button class="btn danger small" data-action="reset-app"><span data-icon="trash"></span> Restaurar padrões</button></div>' +
      '<input type="file" id="importFile" accept="application/json" class="hidden">' +
      '<div class="info-box">Os dados também ficam salvos neste navegador (IndexedDB). Exporte um backup antes de limpar o navegador.</div></div>' +

      '<div class="settings-section"><h3>Fontes dos valores padrão</h3><p>Referências usadas como ponto de partida — tudo é editável.</p>' +
      '<div style="font-size:11px;color:var(--text-secondary);line-height:1.7">' +
      '• Copel/ANEEL 2026: R$ 0,76802/kWh (TUSD+TE) + ICMS/PIS/COFINS ≈ R$ 1,01/kWh.<br>' +
      '• Bambu Lab A1 mini: 80 W em PLA, 75 W em PET-G (wiki oficial).<br>' +
      '• Filamentos: PLA/PET-G R$ 110/kg, TPU R$ 130/kg; resina R$ 150/L.<br>' +
      '• Mercado FDM 2026: peças pequenas R$ 15–45, médias R$ 45–140, grandes R$ 140–400; R$ 0,80–2,50/g.' +
      '</div></div>' +
      '</div></div>';
    paintIcons($('settingsContent'));
  }

  /* ---------- Modais ---------- */
  function openModal(title, subtitle, fields, onSubmit, submitLabel) {
    const root = $('modalRoot');
    const formHtml = fields.map(function (f) {
      const id = 'm_' + f.key;
      let control;
      if (f.type === 'select') {
        control = '<select id="' + id + '">' + f.options.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(f.value) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        control = '<textarea id="' + id + '" rows="3">' + esc(f.value || '') + '</textarea>';
      } else {
        control = '<input id="' + id + '" type="' + (f.type || 'text') + '" step="any" value="' + esc(f.value == null ? '' : f.value) + '"' + (f.required ? ' required' : '') + '>';
      }
      return '<div class="field' + (f.full || f.type === 'textarea' ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label) + '</label>' + control + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</div>';
    }).join('');

    root.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><p>' + esc(subtitle || '') + '</p>' +
      '<form id="modalForm"><div class="form-grid">' + formHtml + '</div><div class="modal-actions">' +
      '<button type="button" class="btn secondary" data-action="modal-close">Cancelar</button>' +
      '<button type="submit" class="btn primary">' + esc(submitLabel || 'Salvar') + '</button></div></form></div>';
    $('overlay').classList.remove('hidden');
    $('modalForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const out = {};
      fields.forEach(function (f) {
        const node = $('m_' + f.key);
        out[f.key] = f.type === 'number' ? numOr(node.value, 0) : node.value;
      });
      closeModal();
      onSubmit(out);
    });
    const first = root.querySelector('input, select, textarea');
    if (first) first.focus();
  }

  function closeModal() {
    $('modalRoot').innerHTML = '';
    $('overlay').classList.add('hidden');
  }

  const MATERIAL_OPTIONS = function () {
    const m = S().settings.materials;
    return [['pla', m.pla.label], ['petg', m.petg.label], ['tpu', m.tpu.label], ['resin', m.resin.label]];
  };

  /* ---------- Ações de registro ---------- */
  function upsert(collection, item) {
    const st = S();
    const arr = st[collection];
    const i = arr.findIndex(function (x) { return x.id === item.id; });
    if (i >= 0) arr[i] = Object.assign({}, arr[i], item);
    else arr.push(item);
    Store.save();
  }

  function removeItem(collection, id) {
    const st = S();
    st[collection] = st[collection].filter(function (x) { return x.id !== id; });
    Store.save();
  }

  function findBy(collection, id) {
    return S()[collection].find(function (x) { return x.id === id; });
  }

  function registerMovement(item, type, qty, origin) {
    const st = S();
    st.movements.push({ id: Store.uid('mv'), date: new Date().toISOString(), stockId: item.id, name: item.name, type: type, qty: Math.abs(qty), unit: item.unit, origin: origin || '' });
  }

  function consumeStock(material, qty, origin) {
    const st = S();
    const item = st.stock.find(function (i) { return i.material === material; });
    if (!item || !qty) return;
    item.qty = Math.max(0, numOr(item.qty) - qty);
    item.updatedAt = new Date().toISOString();
    registerMovement(item, 'saida', qty, origin);
  }

  function clientForm(existing) {
    return [
      { key: 'name', label: 'Nome', value: existing ? existing.name : '', required: true },
      { key: 'document', label: 'CPF/CNPJ', value: existing ? existing.document : '' },
      { key: 'phone', label: 'Telefone / WhatsApp', value: existing ? existing.phone : '' },
      { key: 'email', label: 'E-mail', value: existing ? existing.email : '' },
      { key: 'address', label: 'Endereço', value: existing ? existing.address : '', full: true }
    ];
  }

  function saveClient(data, id) {
    upsert('clients', Object.assign({ id: id || Store.uid('cl') }, data));
    toast('Cliente salvo.');
  }

  function stockForm(existing) {
    return [
      { key: 'name', label: 'Nome do insumo', value: existing ? existing.name : '', required: true },
      { key: 'material', label: 'Material', type: 'select', options: MATERIAL_OPTIONS(), value: existing ? existing.material : 'pla' },
      { key: 'brand', label: 'Marca', value: existing ? existing.brand : '' },
      { key: 'unit', label: 'Unidade', type: 'select', options: [['kg', 'kg'], ['L', 'litro']], value: existing ? existing.unit : 'kg' },
      { key: 'qty', label: 'Quantidade atual', type: 'number', value: existing ? existing.qty : 1 },
      { key: 'min', label: 'Quantidade mínima', type: 'number', value: existing ? existing.min : 0.5 },
      { key: 'cost', label: 'Custo por unidade (R$)', type: 'number', value: existing ? existing.cost : S().settings.materials.pla.price }
    ];
  }

  function saveStock(data, id) {
    const existing = id ? findBy('stock', id) : null;
    const item = Object.assign({ id: id || Store.uid('stk'), updatedAt: new Date().toISOString() }, data);
    upsert('stock', item);
    if (!existing) registerMovement(item, 'entrada', item.qty, 'Cadastro inicial');
    toast('Insumo salvo.');
  }

  function saleForm(existing) {
    return [
      { key: 'product', label: 'Produto / serviço', value: existing ? existing.product : '', required: true, full: true },
      { key: 'client', label: 'Cliente', value: existing ? existing.client : '' },
      { key: 'date', label: 'Data', type: 'date', value: existing ? String(existing.date).slice(0, 10) : new Date().toISOString().slice(0, 10) },
      { key: 'qty', label: 'Quantidade', type: 'number', value: existing ? existing.qty : 1 },
      { key: 'cost', label: 'Custo total (R$)', type: 'number', value: existing ? existing.cost : 0 },
      { key: 'value', label: 'Valor de venda (R$)', type: 'number', value: existing ? existing.value : 0 },
      { key: 'material', label: 'Material consumido', type: 'select', options: [['', 'Nenhum']].concat(MATERIAL_OPTIONS()), value: existing ? existing.material : '' },
      { key: 'consumedQty', label: 'Consumo (kg ou L)', type: 'number', value: existing ? existing.consumedQty : 0, hint: 'Se informado, baixa do estoque.' }
    ];
  }

  function saveSale(data, id, old) {
    const item = Object.assign({ id: id || Store.uid('sale') }, data);
    upsert('sales', item);
    if (!old && data.material && numOr(data.consumedQty) > 0) consumeStock(data.material, numOr(data.consumedQty), 'Venda: ' + data.product);
    toast('Venda registrada.');
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', async function (ev) {
    const goBtn = ev.target.closest('[data-go]');
    if (goBtn) { go(goBtn.dataset.go); return; }

    const nav = ev.target.closest('.nav-item');
    if (nav) { go(nav.dataset.view); return; }

    const action = ev.target.closest('[data-action]');
    if (!action) return;
    const a = action.dataset.action;
    const id = action.dataset.id;
    const st = S();

    try {
      switch (a) {
        case 'modal-close': closeModal(); break;

        case 'quote-pdf': {
          const q = findBy('quotes', id);
          if (!q) return;
          const client = st.clients.find(function (c) { return c.id === q.clientId; });
          const result = Calc.calculate(q.input, st.settings);
          PDFService.gerarOrcamento(result, q, client, st.settings);
          toast('PDF gerado.');
          break;
        }
        case 'quote-edit': {
          const q = findBy('quotes', id);
          if (!q) return;
          currentQuoteId = id;
          draft = Object.assign({}, q.input);
          go('calculator');
          toast('Orçamento carregado para edição.');
          break;
        }
        case 'quote-status': {
          const q = findBy('quotes', id);
          if (!q) return;
          q.status = action.dataset.status;
          if (q.status === 'done') {
            const r = q.result;
            const sale = {
              id: Store.uid('sale'), product: q.title, client: q.clientName, date: new Date().toISOString().slice(0, 10),
              qty: r.qty, cost: r.totalCost, value: r.price,
              material: r.isResin ? 'resin' : q.input.material,
              consumedQty: r.consumedQty, quoteId: q.id, quoteNumber: q.number
            };
            st.sales.push(sale);
            consumeStock(sale.material, sale.consumedQty, 'Orçamento ' + q.number);
            toast('Venda registrada e estoque baixado.');
          } else {
            toast('Status atualizado para ' + q.status + '.');
          }
          Store.save();
          break;
        }
        case 'quote-delete':
          if (confirm('Excluir este orçamento?')) { removeItem('quotes', id); toast('Orçamento excluído.'); }
          break;

        case 'sale-delete':
          if (confirm('Excluir esta venda?')) { removeItem('sales', id); toast('Venda excluída.'); }
          break;

        case 'product-new':
          openModal('Novo produto', 'Item recorrente do catálogo.', [
            { key: 'name', label: 'Nome', required: true }, { key: 'category', label: 'Categoria' },
            { key: 'description', label: 'Descrição', type: 'textarea' },
            { key: 'cost', label: 'Custo (R$)', type: 'number' }, { key: 'price', label: 'Preço (R$)', type: 'number' }
          ], function (d) { upsert('products', Object.assign({ id: Store.uid('pr') }, d)); toast('Produto salvo.'); });
          break;
        case 'product-edit': {
          const p = findBy('products', id);
          openModal('Editar produto', '', [
            { key: 'name', label: 'Nome', value: p.name, required: true }, { key: 'category', label: 'Categoria', value: p.category },
            { key: 'description', label: 'Descrição', type: 'textarea', value: p.description },
            { key: 'cost', label: 'Custo (R$)', type: 'number', value: p.cost }, { key: 'price', label: 'Preço (R$)', type: 'number', value: p.price }
          ], function (d) { upsert('products', Object.assign({ id: id }, d)); toast('Produto salvo.'); });
          break;
        }
        case 'product-delete':
          if (confirm('Excluir produto?')) { removeItem('products', id); toast('Produto excluído.'); }
          break;

        case 'service-new':
          openModal('Novo serviço', 'Serviço adicional oferecido.', [
            { key: 'name', label: 'Nome', required: true }, { key: 'description', label: 'Descrição', type: 'textarea' },
            { key: 'price', label: 'Preço (R$)', type: 'number' }, { key: 'unit', label: 'Unidade', value: 'peça' }
          ], function (d) { upsert('services', Object.assign({ id: Store.uid('srv') }, d)); toast('Serviço salvo.'); });
          break;
        case 'service-edit': {
          const s2 = findBy('services', id);
          openModal('Editar serviço', '', [
            { key: 'name', label: 'Nome', value: s2.name, required: true }, { key: 'description', label: 'Descrição', type: 'textarea', value: s2.description },
            { key: 'price', label: 'Preço (R$)', type: 'number', value: s2.price }, { key: 'unit', label: 'Unidade', value: s2.unit }
          ], function (d) { upsert('services', Object.assign({ id: id }, d)); toast('Serviço salvo.'); });
          break;
        }
        case 'service-delete':
          if (confirm('Excluir serviço?')) { removeItem('services', id); toast('Serviço excluído.'); }
          break;

        case 'client-new': openModal('Novo cliente', 'Dados para o orçamento.', clientForm(), function (d) { saveClient(d); }); break;
        case 'client-edit': {
          const c = findBy('clients', id);
          openModal('Editar cliente', '', clientForm(c), function (d) { saveClient(d, id); });
          break;
        }
        case 'client-delete':
          if (confirm('Excluir cliente?')) { removeItem('clients', id); toast('Cliente excluído.'); }
          break;

        case 'stock-new': openModal('Novo insumo', 'Filamento ou resina em estoque.', stockForm(), function (d) { saveStock(d); }); break;
        case 'stock-edit': {
          const i = findBy('stock', id);
          openModal('Editar insumo', '', stockForm(i), function (d) { saveStock(d, id); });
          break;
        }
        case 'stock-delete':
          if (confirm('Excluir insumo?')) { removeItem('stock', id); toast('Insumo excluído.'); }
          break;
        case 'stock-move': {
          const i = findBy('stock', id);
          openModal('Movimentar estoque', i.name + ' · atual: ' + Calc.r2(i.qty) + ' ' + i.unit, [
            { key: 'type', label: 'Tipo', type: 'select', options: [['entrada', 'Entrada'], ['saida', 'Saída'], ['ajuste', 'Ajuste']], value: 'entrada' },
            { key: 'qty', label: 'Quantidade', type: 'number', value: 1 },
            { key: 'origin', label: 'Origem / observação', value: '' }
          ], function (d) {
            const item = findBy('stock', id);
            const q = numOr(d.qty);
            if (d.type === 'entrada') item.qty = numOr(item.qty) + q;
            else if (d.type === 'saida') item.qty = Math.max(0, numOr(item.qty) - q);
            else item.qty = q;
            item.updatedAt = new Date().toISOString();
            registerMovement(item, d.type, q, d.origin);
            Store.save();
            toast('Estoque atualizado.');
          });
          break;
        }

        case 'sale-new': openModal('Nova venda', 'Registro manual de receita e custo.', saleForm(), function (d) { saveSale(d); }); break;

        case 'cloud-push':
          await Store.pushCloud(); toast('Dados enviados para a nuvem.'); renderCounters(); break;
        case 'cloud-pull': {
          const ok = await Store.pullCloud();
          toast(ok ? 'Dados baixados da nuvem.' : 'Nenhum dado remoto encontrado.', !ok);
          renderView();
          break;
        }
        case 'export-json': {
          const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a2 = document.createElement('a');
          a2.href = url; a2.download = 'molari3d-backup-' + new Date().toISOString().slice(0, 10) + '.json';
          a2.click(); URL.revokeObjectURL(url);
          toast('Backup exportado.');
          break;
        }
        case 'import-json': $('importFile').click(); break;
        case 'reset-app':
          if (confirm('Restaurar todos os padrões? Seus dados serão apagados.')) { Store.reset(); toast('Padrões restaurados.'); renderView(); }
          break;
      }
    } catch (err) {
      console.error(err);
      toast(err.message || 'Erro ao executar ação.', true);
    }
  });

  document.addEventListener('change', function (ev) {
    const t = ev.target;
    if (t.id === 'importFile' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = function () {
        try { Store.importJSON(reader.result); toast('Backup importado.'); renderView(); }
        catch (e) { toast('Arquivo inválido.', true); }
      };
      reader.readAsText(t.files[0]);
    }
    if (t.dataset && t.dataset.setting) {
      let val = t.value;
      const path = t.dataset.setting;
      if (path === 'cloud.autoSync') val = val === 'true';
      else if (t.type === 'number') val = numOr(val, 0);
      setPath(S().settings, path, val);
      Store.save();
      if (path === 'appearance.theme') applyTheme();
      if (currentView === 'settings' && (path.indexOf('company.') === 0 || path.indexOf('materials.') === 0 || path.indexOf('painting.') === 0 || path.indexOf('market.') === 0)) renderSettings();
      if (currentView === 'calculator') refreshCalc();
      toast('Configuração salva.');
    }
    if (t.id === 'quoteFilter') renderQuotes();
  });

  document.addEventListener('input', function (ev) {
    if (ev.target.closest && ev.target.closest('.calc-form')) refreshCalc();
  });

  document.addEventListener('click', function (ev) {
    const seg = ev.target.closest('#processSegment .seg');
    if (seg) {
      draft.process = seg.dataset.process;
      document.querySelectorAll('#processSegment .seg').forEach(function (b) { b.classList.toggle('active', b === seg); });
      syncMaterialOptions();
      refreshCalc();
    }
  });

  $('overlay').addEventListener('click', function () {
    closeModal();
    $('sidebar').classList.remove('open');
  });
  $('menuBtn').addEventListener('click', function () { $('sidebar').classList.add('open'); $('overlay').classList.remove('hidden'); });
  $('themeBtn').addEventListener('click', function () {
    const cur = S().settings.appearance.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    S().settings.appearance.theme = next;
    Store.save(); applyTheme();
    if (currentView === 'settings') renderSettings();
  });
  $('newQuoteBtn').addEventListener('click', function () {
    currentQuoteId = null;
    go('calculator');
  });
  $('clearCalc').addEventListener('click', function () {
    currentQuoteId = null;
    draft = { title: 'Peça impressa 3D', clientId: '', material: draft.process === 'resin' ? 'resin' : 'pla', grams: 0, ml: 0, hours: 0, quantity: 1, colors: 1, painting: 'none', setupMinutes: 15, finishingMinutes: 10, packaging: 2, shipping: 0, price: 0, notes: '', process: draft.process };
    renderCalc();
  });
  $('saveQuoteBtn').addEventListener('click', function () {
    if (!lastResult) return;
    const q = buildQuoteFromDraft();
    if (currentQuoteId) {
      const idx = S().quotes.findIndex(function (x) { return x.id === currentQuoteId; });
      if (idx >= 0) S().quotes[idx] = q;
    } else {
      S().quotes.push(q);
    }
    Store.save();
    currentQuoteId = q.id;
    toast('Orçamento ' + q.number + ' salvo.');
  });
  $('pdfBtn').addEventListener('click', function () {
    if (!lastResult) return;
    const q = buildQuoteFromDraft();
    const client = S().clients.find(function (c) { return c.id === draft.clientId; });
    PDFService.gerarOrcamento(lastResult, q, client, S().settings);
    toast('PDF gerado.');
  });
  function applyTheme() {
    const pref = S().settings.appearance.theme;
    let theme = pref;
    if (pref === 'auto') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = $('themeBtn').querySelector('[data-icon]');
    if (icon) { icon.setAttribute('data-icon', theme === 'dark' ? 'sun' : 'moon'); icon.dataset.painted = ''; }
    paintIcons();
  }

  /* ---------- Init ---------- */
  async function init() {
    await Store.init();
    Store.onChange(function () { renderView(); });
    applyTheme();
    paintIcons();
    renderView();
    go('dashboard');
  }
  init();
})();
