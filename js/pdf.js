/* ============================================================
   pdf.js — Orçamento em PDF (jsPDF com fallback para impressão)
   ============================================================ */
(function (global) {
  'use strict';

  const fmt = function (v) { return global.Calc ? global.Calc.fmtBRL(v) : 'R$ ' + Number(v).toFixed(2); };

  function gerarOrcamento(result, quote, client, settings) {
    const c = settings.company;
    const doc = global.jspdf && global.jspdf.jsPDF ? new global.jspdf.jsPDF() : null;
    const number = quote.number || 'ORC-' + String(new Date().getFullYear());
    const date = new Date(quote.createdAt || Date.now()).toLocaleDateString('pt-BR');
    const validity = new Date(Date.now() + (Number(c.validityDays) || 7) * 86400000).toLocaleDateString('pt-BR');
    const materialName = result.material + (result.isResin ? '' : ' · ' + (quote.colors || 1) + ' cor(es)');

    if (!doc) {
      imprimirFallback(result, quote, client, settings, number, date, validity, materialName);
      return 'print';
    }

    const W = 210, M = 18;
    let y = 0;

    /* Cabeçalho */
    doc.setFillColor(10, 132, 255);
    doc.rect(0, 0, W, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(c.name || 'T&W 3D Maker', M, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(c.tagline || 'Impressão 3D sob medida', M, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ORÇAMENTO', W - M, 17, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nº ' + number, W - M, 24, { align: 'right' });
    doc.text('Emitido em ' + date, W - M, 31, { align: 'right' });

    y = 52;
    doc.setTextColor(30, 30, 32);

    /* Dados da empresa */
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('DADOS DO FORNECEDOR', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const companyLines = [
      c.owner ? 'Responsável: ' + c.owner : '',
      c.document ? 'CPF/CNPJ: ' + c.document : '',
      c.phone ? 'Telefone: ' + c.phone : '',
      c.email ? 'E-mail: ' + c.email : '',
      c.address || ''
    ].filter(Boolean);
    companyLines.forEach(function (line) { doc.text(line, M, y); y += 5; });

    /* Dados do cliente */
    const cx = 112;
    let cy = 52;
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', cx, cy);
    cy += 6;
    doc.setFont('helvetica', 'normal');
    const clientLines = client ? [
      client.name || 'Consumidor final',
      client.document ? 'CPF/CNPJ: ' + client.document : '',
      client.phone ? 'Telefone: ' + client.phone : '',
      client.email ? 'E-mail: ' + client.email : '',
      client.address ? 'Endereço: ' + client.address : ''
    ].filter(Boolean) : ['Consumidor final'];
    clientLines.forEach(function (line) {
      const chunks = doc.splitTextToSize(line, W - cx - M);
      doc.text(chunks, cx, cy);
      cy += 5 * chunks.length;
    });

    y = Math.max(y, cy) + 9;

    /* Descrição */
    doc.setFillColor(245, 245, 247);
    doc.roundedRect(M, y - 5, W - 2 * M, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('DESCRIÇÃO DO SERVIÇO', M + 4, y + 3);
    y += 15;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(String(quote.title || 'Peça impressa 3D'), M, y);
    y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const details = [
      'Processo: ' + (result.isResin ? 'Impressão em resina (SLA)' : 'Impressão FDM · ' + materialName),
      'Quantidade: ' + result.qty + ' unidade(s)',
      result.isResin
        ? 'Volume estimado: ' + Calc.r2((quote.ml || 0) * (1 + settings.costs.waste / 100) * result.qty) + ' ml (inclui perdas)'
        : 'Peso estimado: ' + Calc.r2((quote.grams || 0) * (1 + settings.costs.waste / 100) * result.qty) + ' g (inclui perdas)',
      'Tempo estimado de impressão: ' + Calc.r2(result.hours) + ' h',
      (quote.painting && quote.painting !== 'none') ? 'Acabamento: pintura ' + (quote.painting === 'simple' ? 'simples' : 'complexa') : 'Acabamento: padrão'
    ];
    details.forEach(function (line) { doc.text(line, M, y); y += 5; });

    if (quote.notes) {
      y += 2;
      doc.setFont('helvetica', 'bold'); doc.text('Observações:', M, y);
      doc.setFont('helvetica', 'normal');
      const notes = doc.splitTextToSize(quote.notes, W - 2 * M);
      y += 5;
      doc.text(notes, M, y);
      y += notes.length * 5;
    }

    y += 8;

    /* Valor */
    if (y > 225) { doc.addPage(); y = 25; }
    doc.setFillColor(10, 132, 255);
    doc.roundedRect(M, y - 6, W - 2 * M, 30, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('VALOR TOTAL DO ORÇAMENTO', M + 8, y + 3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text(fmt(result.price), M + 8, y + 15);
    if (result.qty > 1) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(fmt(result.price / result.qty) + ' / unidade', W - M - 8, y + 13, { align: 'right' });
    }
    doc.setTextColor(30, 30, 32);
    y += 34;

    /* Condições */
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('CONDIÇÕES', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const terms = [
      '• Validade deste orçamento: ' + validity + ' (' + (c.validityDays || 7) + ' dias).',
      '• Valores sujeitos à aprovação do arquivo 3D e das especificações finais.',
      '• Prazo de entrega a combinar após a aprovação.',
      c.minimumOrder ? '• Pedido mínimo: ' + fmt(c.minimumOrder) + '.' : '',
      c.pix ? '• Pagamento via Pix: ' + c.pix : '',
      c.bankInfo ? '• Dados bancários: ' + c.bankInfo : ''
    ].filter(Boolean);
    terms.forEach(function (line) {
      const chunks = doc.splitTextToSize(line, W - 2 * M);
      doc.text(chunks, M, y);
      y += chunks.length * 4.7;
    });

    y += 10;
    doc.setDrawColor(200, 200, 205);
    doc.line(M, y, 92, y);
    doc.line(118, y, W - M, y);
    doc.setFontSize(8);
    doc.text(c.owner || c.name, M, y + 5);
    doc.text(client ? client.name : 'Cliente', 118, y + 5);

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 155);
      doc.text(c.name + ' · ' + c.address + ' · Orçamento ' + number, M, W - 12);
      doc.text('Página ' + i + ' / ' + pages, W - M, W - 12, { align: 'right' });
    }

    const safe = String(quote.title || 'orcamento').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    doc.save('orcamento-' + number + '-' + safe + '.pdf');
    return 'jspdf';
  }

  function imprimirFallback(result, quote, client, settings, number, date, validity, materialName) {
    const c = settings.company;
    const esc = function (v) { return String(v == null ? '' : v).replace(/[&<>]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]; }); };
    const div = document.createElement('div');
    div.className = 'print-doc';
    div.innerHTML =
      '<div style="border-bottom:4px solid #0071e3;padding-bottom:16px;display:flex;justify-content:space-between">' +
      '<div><h1 style="font-size:26px">' + esc(c.name) + '</h1><p style="color:#666;font-size:12px">' + esc(c.tagline) + '</p>' +
      '<p style="font-size:11px;color:#666">' + [c.owner, c.document, c.phone, c.email, c.address].filter(Boolean).map(esc).join(' · ') + '</p></div>' +
      '<div style="text-align:right"><strong>ORÇAMENTO Nº ' + esc(number) + '</strong><br><small>' + esc(date) + '</small></div></div>' +
      '<h2 style="margin-top:28px;font-size:16px">' + esc(quote.title) + '</h2>' +
      '<p style="font-size:12px;color:#555">' +
      'Processo: ' + (result.isResin ? 'Resina SLA' : 'FDM · ' + esc(materialName)) + '<br>' +
      'Quantidade: ' + result.qty + ' unidade(s)<br>' +
      'Tempo estimado: ' + Calc.r2(result.hours) + ' h<br>' +
      (quote.notes ? 'Observações: ' + esc(quote.notes) : '') + '</p>' +
      '<h3 style="margin-top:24px">Cliente</h3><p style="font-size:12px">' + (client ? esc([client.name, client.document, client.phone, client.email].filter(Boolean).join(' · ')) : 'Consumidor final') + '</p>' +
      '<div style="margin-top:28px;background:#0071e3;color:#fff;padding:18px;border-radius:12px">' +
      '<small>VALOR TOTAL</small><div style="font-size:30px;font-weight:700">' + esc(fmt(result.price)) + '</div></div>' +
      '<p style="margin-top:22px;font-size:11px;color:#666">Validade: ' + esc(validity) + '. ' + (c.pix ? 'Pix: ' + esc(c.pix) : '') + '</p>';
    document.body.appendChild(div);
    window.print();
    setTimeout(function () { div.remove(); }, 1000);
  }

  global.PDFService = { gerarOrcamento: gerarOrcamento };
})(window);
