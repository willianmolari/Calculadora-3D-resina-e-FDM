# T&W 3D Maker — Calculadora & Gestão

Calculadora de custos e orçamentos para impressão 3D **FDM** e **resina**, com gestão de vendas, produtos, estoque, serviços, clientes e geração de PDF. Interface inspirada no estilo Apple (claro/escuro), feita em **HTML + CSS + JavaScript puro**.

## O que o app faz

- **Calculadora FDM** — PLA, PET-G e TPU, com peso do fatiador, horas de impressão, energia da Bambu Lab A1 mini e desgaste da máquina.
- **Multicolorido (AMS)** — cada cor extra adiciona purga de filamento (g) e tempo de impressão, ambos configuráveis.
- **Calculadora de resina** — consumo em ml, R$/litro, lavagem/cura UV e pintura (simples R$ 20 / complexa R$ 50).
- **Margem sobre venda** — `preço = custo ÷ (1 − margem)`. Ideal 65%, mínimo 40%, ambos editáveis. O app avisa quando o preço fica abaixo do mínimo.
- **Comparativo de mercado** — mostra o R$/g da peça contra a faixa praticada (padrão R$ 0,80 a R$ 2,50/g).
- **Administração** — dashboard com faturamento, custos, lucro, margem, gráfico 6 meses, ranking de produtos e alertas; vendas com receita/custo/lucro; catálogo de produtos; serviços; clientes.
- **Estoque** — entradas, saídas, ajustes e alertas de reposição. Na lista de orçamentos, o botão **Virar venda** converte o orçamento em venda e baixa o material do estoque. O mesmo acontece ao avançar o status até **Concluído**.
- **Orçamentos** — salvar, editar, avançar status (rascunho → enviado → aprovado → concluído) e gerar **PDF** com dados da empresa, do cliente, condições e valor.
- **Configurações** — *todos* os valores são editáveis: materiais, pintura, energia, máquinas, purga do AMS, margens, taxas, perdas, dados da empresa e parâmetros de mercado.
- **Banco de dados** — IndexedDB no navegador (funciona offline) + sincronização com **Supabase gratuito** (Postgres), com exportação/importação de backup JSON.
- **Acesso por perfil** — login obrigatório para qualquer tela. Administradores veem tudo; vendedores acessam calculadora, orçamentos, vendas próprias, produtos (somente leitura) e sua comissão.
- **Comissão** — padrão de 50% do lucro (`(valor da venda − custo) ÷ 2`), editável em **Configurações → Mão de obra, margens e mercado**.
- **Quem vendeu?** — ao criar uma venda, o admin seleciona o vendedor na lista de usuários ativos; o vendedor comum fica fixado nele. Vendas e orçamentos registram `sellerId`/`sellerName`. O dashboard tem filtro por vendedor e ranking com faturamento e comissão.
- **Exclusão de venda** — vendedor não exclui diretamente: abre uma solicitação com motivo (com aviso por e-mail ao admin). Somente admin aprova/recusa em **Solicitações**. A aprovação estorna o material consumido ao estoque e mantém o registro da solicitação como trilha de auditoria.
- **Compartilhamento** — produtos, clientes e orçamentos são compartilhados entre todos os usuários. Cada vendedor vê apenas suas próprias vendas/faturamento; o admin vê todas.

## Acesso

Contas liberadas neste projeto:

| Nome | E-mail | Perfil |
|---|---|---|
| Willian Molari | williangabriel681@gmail.com | Administrador |
| Thais Vieira de Oliveira | taisv132@gmail.com | Administrador |

O login usa Supabase Auth (e-mail + senha). O RLS do Postgres exige sessão válida **e** perfil ativo (`admin` ou `user`). Não existe modo anônimo: sem sessão válida, o app mostra apenas a tela de login. A tela **Usuários** (somente admin) cria/editar/desativa/exclui contas e define o perfil.

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
3. Em **Project Settings → API**, copie a **Project URL** e a **publishable key** (`sb_publishable_...`). As credenciais de login são entregues separadamente aos administradores.
4. No app, abra **Configurações → Banco de dados na nuvem**, cole os valores e use **Enviar para a nuvem** / **Baixar da nuvem**. Ative a sincronização automática se quiser.

A chave publicada (`sb_publishable_...`) é própria para uso no navegador. O RLS exige `authenticated` **e** perfil ativo para ler/gravar o workspace (compartilhado). As funções `admin_*` usam `SECURITY DEFINER` e validam o perfil do chamador antes de agir. Solicitações de exclusão são gravadas em `public.sale_delete_requests`: o vendedor cria apenas a própria (`seller_id = auth.uid()`), e somente admin pode aprovar/recusar.

Para criar novos usuários, use a tela **Usuários** do app (somente admins). O schema também aceita criação manual em *Authentication → Users*, seguida de:

```sql
update public.profiles set role = 'admin', active = true where email = 'email@exemplo.com';
```

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
js/auth.js          Login Supabase Auth, perfis admin/usuário e gestão de contas
js/app.js           Interfaces, navegação, CRUD e eventos
supabase/schema.sql Tabelas, RLS, policies e funções admin do banco gratuito
```
