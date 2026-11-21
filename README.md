# Molari 3D — Calculadora & Gestão

Calculadora de custos e orçamentos para impressão 3D **FDM** e **resina**, com gestão de vendas, produtos, estoque, serviços, clientes e geração de PDF. Interface inspirada no estilo Apple (claro/escuro), feita em **HTML + CSS + JavaScript puro**.

## O que o app faz

- **Calculadora FDM** — PLA, PET-G e TPU, com peso do fatiador, horas de impressão, energia da Bambu Lab A1 mini e desgaste da máquina.
- **Multicolorido (AMS)** — cada cor extra adiciona purga de filamento (g) e tempo de impressão, ambos configuráveis.
- **Calculadora de resina** — consumo em ml, R$/litro, lavagem/cura UV e pintura (simples R$ 20 / complexa R$ 50).
- **Margem sobre venda** — `preço = custo ÷ (1 − margem)`. Ideal 65%, mínimo 40%, ambos editáveis. O app avisa quando o preço fica abaixo do mínimo.
- **Comparativo de mercado** — mostra o R$/g da peça contra a faixa praticada (padrão R$ 0,80 a R$ 2,50/g).
- **Administração** — dashboard com faturamento, custos, lucro, margem, gráfico 6 meses, ranking de produtos e alertas; vendas com receita/custo/lucro; catálogo de produtos; serviços; clientes.
- **Estoque** — entradas, saídas, ajustes e alertas de reposição. Ao marcar um orçamento como **Concluído**, uma venda é criada e o material é baixado do estoque automaticamente.
- **Orçamentos** — salvar, editar, avançar status (rascunho → enviado → aprovado → concluído) e gerar **PDF** com dados da empresa, do cliente, condições e valor.
- **Configurações** — *todos* os valores são editáveis: materiais, pintura, energia, máquinas, purga do AMS, margens, taxas, perdas, dados da empresa e parâmetros de mercado.
- **Banco de dados** — IndexedDB no navegador (funciona offline) + sincronização opcional com **Supabase gratuito** (Postgres), com exportação/importação de backup JSON.

## Rodando localmente

É uma página estática: abra `index.html` no navegador. Para usar o service worker/fetch sem restrições, prefira servir via HTTP:

```bash
cd calculadora-3d
python3 -m http.server 8000
# abra http://localhost:8000
```

## Banco de dados na nuvem (gratuito)

1. Crie um projeto em [supabase.com](https://supabase.com) (plano Free).
2. No **SQL Editor**, execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. No app, abra **Configurações → Banco de dados na nuvem**, cole os valores e use **Enviar para a nuvem** / **Baixar da nuvem**. Ative a sincronização automática se quiser.

A chave `anon` é própria para uso no navegador e está protegida pelas policies do RLS. O schema usa uma política aberta para simplificar o uso pessoal — se o app ficar exposto publicamente, troque para `authenticated` e adicione login.

## Premissas e fontes dos valores padrão

| Parâmetro | Valor padrão | Fonte |
|---|---|---|
| Energia (Curitiba) | R$ 1,01/kWh | Copel/ANEEL REH 3.592/2026: R$ 0,76802/kWh (TUSD+TE) + ICMS 19% + PIS/COFINS, bandeira verde 11/2026 |
| A1 mini PLA / PET-G | 80 W / 75 W | Wiki oficial Bambu Lab (consumo médio medido) |
| A1 mini máxima | 150 W | Wiki oficial (usada só como referência, não no cálculo) |
| PLA e PET-G | R$ 110/kg | Informado por você; compatível com mercado 2026 |
| TPU | R$ 130/kg | Informado por você |
| Resina | R$ 150/L | Informado por você |
| Pintura | R$ 20 simples / R$ 50 complexa | Informado por você |
| Purga AMS | 5 g e 1,5 min por troca de cor | Estimativa configurável |
| Perdas de material | 5% | Estimativa configurável |
| Reserva de falhas | 8% FDM / 12% resina | Estimativa configurável |
| Mercado FDM | R$ 0,80–2,50/g | Faixas publicadas em 2026 (peças pequenas R$ 15–45, médias R$ 45–140, grandes R$ 140–400) |

Todos esses números podem ser alterados no menu **Configurações**.

## Fórmulas

```
custo material FDM = ((gramas × (1 + perdas)) + purga_AMS) × preço_kg
custo material resina = ml × (1 + perdas) ÷ 1000 × preço_litro
energia = horas × watts ÷ 1000 × R$/kWh
desgaste = horas × (preço_máquina ÷ vida_útil + manutenção/h)
mão de obra = (preparação + acabamento × qtd) ÷ 60 × R$/h
custo total = materiais + energia + desgaste + mão de obra + pós-processo
              + reserva de falhas + embalagem + frete + taxas

preço ideal = custo total ÷ (1 − 0,65)
preço mínimo = custo total ÷ (1 − 0,40)
lucro = preço − custo total
margem = lucro ÷ preço  (não é markup sobre o custo)
```

## Estrutura

```
index.html          Estrutura da aplicação (SPA)
css/styles.css      Design system Apple-like, temas claro/escuro, responsivo
js/store.js         Estado, IndexedDB, backup JSON e cliente Supabase
js/calculate.js     Motor de custos e precificação
js/pdf.js           Geração de orçamento em PDF (jsPDF + fallback de impressão)
js/app.js           Interfaces, navegação, CRUD e eventos
supabase/schema.sql Tabela e policies do banco gratuito
```
