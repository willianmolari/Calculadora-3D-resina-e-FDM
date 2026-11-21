/* ============================================================
   calculate.js — Motor de custos e precificação
   Margem = lucro / preço de venda (não markup sobre o custo)
   ============================================================ */
(function (global) {
  'use strict';

  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function calculate(input, s) {
    const qty = Math.max(1, Number(input.quantity) || 1);
    const isResin = input.process === 'resin';
    const mat = isResin ? s.materials.resin : (s.materials[input.material] || s.materials.pla);
    const m = s.machines;
    const e = s.energy;
    const c = s.costs;

    const lines = [];
    const add = function (label, value, note) {
      lines.push({ label: label, value: r2(value), note: note || '' });
      return value;
    };

    /* --- Material --- */
    const wasteFactor = 1 + (Number(c.waste) || 0) / 100;
    let materialCost, purgeGrams = 0, purgeMinutes = 0, baseMaterial = 0;
    let consumedQty = 0;

    if (isResin) {
      const mlPerPiece = Math.max(0, Number(input.ml) || 0);
      consumedQty = (mlPerPiece * wasteFactor * qty) / 1000; // litros
      materialCost = consumedQty * (Number(mat.price) || 0);
      add('Resina (' + r2(mlPerPiece * wasteFactor * qty) + ' ml c/ perdas)', materialCost, 'R$ ' + r2(mat.price) + '/L');
    } else {
      const gramsPerPiece = Math.max(0, Number(input.grams) || 0);
      const colors = Math.max(1, Number(input.colors) || 1);
      const changes = Math.max(0, colors - 1);
      purgeGrams = changes * (Number(m.purgeGrams) || 0);
      purgeMinutes = changes * (Number(m.purgeMinutes) || 0);
      const gramsTotal = (gramsPerPiece * wasteFactor + purgeGrams) * qty;
      consumedQty = gramsTotal / 1000; // kg
      materialCost = consumedQty * (Number(mat.price) || 0);
      baseMaterial = (gramsPerPiece * wasteFactor * qty) / 1000 * (Number(mat.price) || 0);
      const purgeCost = (purgeGrams * qty) / 1000 * (Number(mat.price) || 0);
      let label = mat.label + ' (' + r2(gramsPerPiece * wasteFactor * qty) + ' g c/ perdas)';
      if (colors > 1) label += ' + purga AMS ' + r2(purgeGrams * qty) + ' g';
      add(label, materialCost, 'R$ ' + r2(mat.price) + '/kg · ' + colors + ' cor(es)');
    }

    /* --- Tempo de máquina --- */
    const hoursPiece = Math.max(0, Number(input.hours) || 0);
    const hours = hoursPiece * qty + (purgeMinutes / 60) * qty;
    const watts = isResin
      ? (Number(e.resinWatts) || 65)
      : (input.material === 'petg' ? (Number(e.petgWatts) || 75)
        : input.material === 'tpu' ? (Number(e.tpuWatts) || 85)
          : (Number(e.fdmWatts) || 80));
    const kwh = hours * (watts / 1000);
    const energyCost = kwh * (Number(e.pricePerKwh) || 0);
    add('Energia elétrica (' + r2(kwh) + ' kWh)', energyCost, r2(watts) + ' W · R$ ' + r2(e.pricePerKwh) + '/kWh');

    const machineName = isResin ? m.resinName : m.fdmName;
    const machinePrice = Number(isResin ? m.resinPrice : m.fdmPrice) || 0;
    const lifespan = Number(isResin ? m.resinLifespan : m.fdmLifespan) || 1;
    const maintenance = Number(isResin ? m.resinMaintenance : m.fdmMaintenance) || 0;
    const depreciationRate = machinePrice / lifespan + maintenance;
    const depreciation = hours * depreciationRate;
    add('Desgaste + manutenção (' + r2(hours) + ' h)', depreciation, machineName);

    /* --- Mão de obra --- */
    const setupMin = Math.max(0, Number(input.setupMinutes) || 0);
    const finishingMin = Math.max(0, Number(input.finishingMinutes) || 0);
    const laborRate = Number(s.labor.hourlyRate) || 0;
    const labor = ((setupMin + finishingMin * qty) / 60) * laborRate;
    add('Mão de obra (' + r2(setupMin + finishingMin * qty) + ' min)', labor, 'R$ ' + r2(laborRate) + '/h');

    /* --- Pós-processamento --- */
    let postCost = 0;
    if (isResin) {
      postCost = (Number(m.washCureCost) || 0) * qty;
      if (postCost) add('Lavagem + cura UV', postCost, 'por peça');
    }
    const painting = input.painting || 'none';
    let paintingCost = 0;
    if (painting === 'simple' || painting === 'complex') {
      paintingCost = (Number(s.painting[painting]) || 0) * qty;
      add('Pintura ' + (painting === 'simple' ? 'simples' : 'complexa'), paintingCost, qty + 'x R$ ' + r2(s.painting[painting]));
    }

    /* --- Reservas e encargos --- */
    const subtotal = materialCost + energyCost + depreciation + labor + postCost + paintingCost;
    const failRate = Number(isResin ? c.failureResin : c.failureFdm) || 0;
    const failure = subtotal * failRate / 100;
    if (failure) add('Reserva de falhas (' + failRate + '%)', failure, 'reimpressões e refugo');

    const packaging = (Number(input.packaging) || 0) * qty;
    if (packaging) add('Embalagem', packaging, qty + ' peça(s)');

    const shipping = Number(input.shipping) || 0;
    if (shipping) add('Frete / entrega', shipping, '');

    const platformRate = Number(c.platformFee) || 0;
    const platform = (subtotal + failure + packaging + shipping) * platformRate / 100;
    if (platform) add('Taxa da plataforma (' + platformRate + '%)', platform, '');

    const extra = Number(c.extraFixed) || 0;
    if (extra) add('Outros custos fixos', extra, '');

    const totalCost = subtotal + failure + packaging + shipping + platform + extra;

    /* --- Preço e margem --- */
    const idealPct = Math.min(95, Math.max(1, Number(s.margins.ideal) || 65));
    const minPct = Math.min(95, Math.max(1, Number(s.margins.minimum) || 40));
    const idealPrice = totalCost / (1 - idealPct / 100);
    const minPrice = totalCost / (1 - minPct / 100);
    const requested = Number(input.price) || 0;
    const price = requested > 0 ? requested : idealPrice;
    const profit = price - totalCost;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    const markup = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    const printGrams = Math.max(1, (Number(input.grams) || 0) * qty);
    const perGram = isResin ? null : price / printGrams;
    const perHour = hours > 0 ? price / hours : 0;
    const costPerHour = hours > 0 ? (energyCost + depreciation) / hours : 0;
    const machineHourRate = costPerHour;

    let status = 'ok';
    if (margin < minPct) status = 'danger';
    else if (margin < idealPct) status = 'warning';

    return {
      input: input,
      qty: qty,
      process: input.process,
      material: mat.label,
      lines: lines,
      subtotal: r2(subtotal),
      totalCost: r2(totalCost),
      idealPrice: r2(idealPrice),
      minPrice: r2(minPrice),
      price: r2(price),
      profit: r2(profit),
      margin: r2(margin),
      markup: r2(markup),
      perGram: perGram === null ? null : r2(perGram),
      perHour: r2(perHour),
      costPerHour: r2(costPerHour),
      machineHourRate: r2(machineHourRate),
      kwh: r2(kwh),
      hours: r2(hours),
      consumedQty: r2(consumedQty),
      isResin: isResin,
      status: status,
      targetIdeal: idealPct,
      targetMin: minPct
    };
  }

  function marketCheck(result, s) {
    const min = Number(s.market.perGramMin) || 0.8;
    const max = Number(s.market.perGramMax) || 2.5;
    if (result.isResin || result.perGram === null) {
      return { label: 'Resina', text: 'Para resina, compare com peças similares: miniaturas R$ 12–40, bustos R$ 80–300.', position: 50 };
    }
    const p = result.perGram;
    const position = Math.max(0, Math.min(100, ((p - min) / (max - min)) * 100));
    let text;
    if (p < min) text = 'Abaixo da faixa usual de mercado (' + fmtBRL(min) + '/g). Você pode estar deixando dinheiro na mesa.';
    else if (p > max) text = 'Acima da faixa usual (' + fmtBRL(max) + '/g). Justifique com acabamento, prazo ou modelagem.';
    else text = 'Dentro da faixa praticada no mercado brasileiro. Preço competitivo.';
    return { label: fmtBRL(p) + '/g', text: text, position: position };
  }

  function fmtBRL(v) {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0); }
    catch (e) { return 'R$ ' + r2(v).toFixed(2); }
  }

  global.Calc = { calculate: calculate, marketCheck: marketCheck, fmtBRL: fmtBRL, r2: r2 };
})(window);
