"use client";

import { useMemo, useState, type FormEvent } from "react";
import { GoogleConnector } from "./GoogleConnector";
import {
  LayoutDashboard,
  ReceiptText,
  CalendarDays,
  ChartNoAxesCombined,
  Wallet,
  Settings2,
  Plus,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  RefreshCcw,
  X,
  Menu,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { demoSnapshot } from "@/lib/demo/data";
import { formatDate, formatMoney, parseMoneyCents } from "@/lib/finance/format";
import {
  billState,
  monthSummary,
  monthlyHistory,
  previousMonth,
  spendingInsights,
} from "@/lib/finance/analytics";
import { calendarPreview } from "@/lib/finance/calendar-plan";
import type { Bill, Budget, Expense, Snapshot, ImportWarning } from "@/lib/finance/types";

type View =
  | "Dashboard"
  | "Despesas"
  | "Contas"
  | "Calendário"
  | "Relatórios"
  | "Orçamentos"
  | "Configurações";
const tabs: Array<{ name: View; icon: typeof LayoutDashboard }> = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Despesas", icon: ReceiptText },
  { name: "Contas", icon: Wallet },
  { name: "Calendário", icon: CalendarDays },
  { name: "Relatórios", icon: ChartNoAxesCombined },
  { name: "Orçamentos", icon: CreditCard },
  { name: "Configurações", icon: Settings2 },
];
const MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12"];
const categories = [
  "Alimentação",
  "Casa",
  "Compras",
  "Saúde",
  "Supermercado",
  "Transporte",
  "Outros",
];
const todayInBrazil = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return value.year + "-" + value.month + "-" + value.day;
};

function MiniCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof LayoutDashboard;
  tone?: string;
}) {
  return (
    <section className="mini-card">
      <div className="mini-top">
        <span>{title}</span>
        <span className={"mini-icon " + (tone || "")}>
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{subtitle}</small>
    </section>
  );
}

export function FinanceApp() {
  const [view, setView] = useState<View>("Dashboard");
  const [dataMode, setDataMode] = useState<"demo" | "google-read-only">("demo");
  const [month, setMonth] = useState("2026-11");
  const [expenses, setExpenses] = useState<Expense[]>(demoSnapshot.expenses);
  const [bills, setBills] = useState<Bill[]>(demoSnapshot.bills);
  const [budgets, setBudgets] = useState<Budget[]>(demoSnapshot.budgets);
  const [showForm, setShowForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("Alimentação");
  const [date, setDate] = useState("2026-11-08");
  const asOf = todayInBrazil();
  const summary = useMemo(
    () => monthSummary(expenses, bills, budgets, month, asOf),
    [expenses, bills, budgets, month, asOf],
  );
  const currentExpenses = expenses
    .filter(
      (e) =>
        e.date.startsWith(month) &&
        (e.description + e.category + (e.payer || "")).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const visibleBills = bills
    .filter((b) => b.dueDate.startsWith(month))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const history = monthlyHistory(expenses);
  const lastMonth = monthSummary(expenses, bills, budgets, previousMonth(month), asOf);
  const percentDelta =
    lastMonth.totalCents > 0
      ? Math.round((summary.totalCents / lastMonth.totalCents - 1) * 100)
      : null;

  function addDemoExpense(event: FormEvent) {
    event.preventDefault();
    if (dataMode !== "demo") return;
    const cents = parseMoneyCents(value);
    if (!description.trim() || cents === null || cents <= 0 || !date) {
      setNotice("Confira descrição, data e valor.");
      return;
    }
    setExpenses((list) => [
      {
        id: "demo-" + (list.length + 1),
        date,
        description: description.trim(),
        category,
        payer: "Pessoa A",
        method: "Pix",
        account: "Conta Exemplo",
        amountCents: cents,
        source: "direct",
      },
      ...list,
    ]);
    setShowForm(false);
    setDescription("");
    setValue("");
    setMonth(date.slice(0, 7));
    setView("Despesas");
    setNotice("Despesa simulada adicionada. Não foi salva no Google Sheets.");
  }
  function markPaid(id: string) {
    if (dataMode !== "demo") return;
    setBills((list) =>
      list.map((bill) =>
        bill.id === id
          ? {
              ...bill,
              status: "paid",
              paidCents: bill.plannedCents,
              paidAt: asOf,
            }
          : bill,
      ),
    );
    setNotice("Pagamento simulado. Nenhuma alteração foi enviada à planilha.");
  }
  function editBudget(target: string, input: string) {
    if (dataMode !== "demo") return;
    const cents = parseMoneyCents(input);
    if (cents === null || cents < 0) {
      setNotice("Valor de orçamento inválido.");
      return;
    }
    setBudgets((list) =>
      list.map((b) => (b.category === target ? { ...b, limitCents: cents } : b)),
    );
    setNotice("Orçamento da demonstração atualizado nesta sessão.");
  }
  function restoreDemo() {
    setExpenses(demoSnapshot.expenses);
    setBills(demoSnapshot.bills);
    setBudgets(demoSnapshot.budgets);
    setDataMode("demo");
    setNotice("Demonstração restaurada.");
  }
  function showReadOnlyWorkbook(snapshot: Snapshot, warnings: ImportWarning[]) {
    if (snapshot.mode !== "google-read-only") return;
    setExpenses(snapshot.expenses);
    setBills(snapshot.bills);
    setBudgets(snapshot.budgets);
    setDataMode("google-read-only");
    setShowForm(false);
    setView("Dashboard");
    setNotice(warnings.length
      ? "Leitura concluída com " + warnings.length + " avisos de mapeamento. Confira a origem antes de usar os totais."
      : "Dados carregados somente para leitura. Nenhum lançamento ou pagamento será gravado.");
  }
  function goto(next: View) {
    setView(next);
    setMenuOpen(false);
    setNotice("");
  }

  return (
    <div className="app-frame">
      <aside className={"sidebar " + (menuOpen ? "sidebar-open" : "")}>
        <div className="brand">
          <div className="brand-mark">
            F<span>•</span>
          </div>
          <div>
            <strong>
              finance<span>hub</span>
            </strong>
            <small>Personal Finance</small>
          </div>
        </div>
        <div className="nav-caption">ÁREA DE TRABALHO</div>
        <nav aria-label="Menu principal">
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              type="button"
              className={"nav-item " + (name === view ? "active" : "")}
              onClick={() => goto(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === view && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={19} />
          <div>
            <strong>Seus dados, suas regras</strong>
            <small>Demo 100% fictícia e isolada</small>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button aria-label="Fechar menu" className="scrim" onClick={() => setMenuOpen(false)} />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              aria-label="Abrir menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={23} />
            </button>
            <span className="crumb">Visão geral</span>
            <ChevronRight size={15} className="crumb-arrow" />
            <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-tag">
              <span className="demo-dot" /> {dataMode === "demo" ? "MODO DEMONSTRAÇÃO" : "GOOGLE SHEETS · SOMENTE LEITURA"}
            </span>
            <span className="avatar">FH</span>
          </div>
        </header>
        <main className="main-content">
          <div className="intro">
            <div>
              <div className="eyebrow">CONTROLE FINANCEIRO INTELIGENTE</div>
              <h1>{view === "Dashboard" ? "Visão geral das finanças" : view}</h1>
              <p>
                {view === "Dashboard"
                  ? "Tudo o que importa para manter suas contas em dia."
                  : "Explore as funcionalidades com lançamentos e valores fictícios."}
              </p>
            </div>
            <div className="intro-actions">
              <label className="month-select">
                Período{" "}
                <select
                  aria-label="Selecionar mês"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {MONTHS.map((m) => (
                    <option value={m} key={m}>
                      {new Date(m + "-02T12:00:00Z").toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button-primary" onClick={() => setShowForm(true)} disabled={dataMode !== "demo"}>
                <Plus size={18} /> Nova despesa
              </button>
            </div>
          </div>
          <div className="info-strip">
            <ShieldCheck size={17} />
            <span>
              {dataMode === "demo"
                ? "Ambiente de demonstração. Os dados são sintéticos e as alterações são temporárias, sem integração com suas contas."
                : "Consulta de dados Google em memória nesta aba. Modo somente leitura, sem alterações em planilhas ou calendários."}
            </span>
          </div>
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Fechar aviso">
                <X size={16} />
              </button>
            </div>
          )}

          {view === "Dashboard" && (
            <>
              <section className="stats-grid">
                <MiniCard
                  title="Despesas do mês"
                  value={formatMoney(summary.totalCents)}
                  subtitle={
                    percentDelta === null
                      ? "Sem mês anterior"
                      : (percentDelta > 0 ? "↑ " : "↓ ") +
                        Math.abs(percentDelta) +
                        "% vs. mês anterior"
                  }
                  icon={ArrowUpRight}
                  tone="coral"
                />
                <MiniCard
                  title="Contas pagas"
                  value={String(summary.paidCount)}
                  subtitle="Vencimentos deste mês"
                  icon={CheckCircle2}
                  tone="mint"
                />
                <MiniCard
                  title="Contas em aberto"
                  value={formatMoney(summary.pendingCents)}
                  subtitle={summary.openCount + " contas pendentes"}
                  icon={Clock3}
                  tone="gold"
                />
                <MiniCard
                  title="Contas vencidas"
                  value={String(summary.overdueCount)}
                  subtitle="Precisam de atenção"
                  icon={AlertTriangle}
                  tone="rose"
                />
              </section>
              <div className="main-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Evolução dos gastos</h2>
                      <p>Comparativo mensal</p>
                    </div>
                    <span className="chip">R$</span>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={255}>
                      <BarChart
                        data={history.map((h) => ({
                          label: h.month.slice(5) + "/" + h.month.slice(2, 4),
                          valor: Math.round(h.cents / 100),
                        }))}
                      >
                        <CartesianGrid vertical={false} stroke="#e9eeec" />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#7c8c8a" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#7c8c8a" }}
                          width={46}
                        />
                        <Tooltip
                          formatter={(v) => formatMoney(Number(v) * 100)}
                          cursor={{ fill: "#e7f4ef" }}
                        />
                        <Bar dataKey="valor" fill="#168477" radius={[7, 7, 0, 0]} maxBarSize={54} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Por categoria</h2>
                      <p>Distribuição no período</p>
                    </div>
                    <span className="chip">Top 5</span>
                  </div>
                  <div className="category-list">
                    {summary.categories.slice(0, 5).map((c, i) => (
                      <div className="category" key={c.category}>
                        <div className="category-title">
                          <span>
                            <i className={"category-dot dot-" + i} />
                            {c.category}
                          </span>
                          <strong>{formatMoney(c.cents)}</strong>
                        </div>
                        <div className="progress">
                          <span
                            style={{
                              width:
                                (summary.totalCents > 0
                                  ? Math.max(1, (c.cents / summary.totalCents) * 100)
                                  : 0) + "%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {!summary.categories.length && <p>Nenhuma despesa neste período.</p>}
                  </div>
                </section>
              </div>
              <div className="main-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Próximos vencimentos</h2>
                      <p>Contas que merecem atenção</p>
                    </div>
                    <button className="text-button" onClick={() => goto("Contas")}>
                      Ver todas <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="rows-list">
                    {summary.upcoming.length ? (
                      summary.upcoming.map((b) => (
                        <div className="list-row" key={b.id}>
                          <span className="row-icon">
                            <CalendarDays size={18} />
                          </span>
                          <div className="row-main">
                            <strong>{b.description}</strong>
                            <small>Vence em {formatDate(b.dueDate)}</small>
                          </div>
                          <strong>
                            {b.plannedCents === null
                              ? "Não informado"
                              : formatMoney(b.plannedCents)}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p>Não há vencimentos futuros neste período.</p>
                    )}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Últimos lançamentos</h2>
                      <p>Movimentações simuladas</p>
                    </div>
                    <button className="text-button" onClick={() => goto("Despesas")}>
                      Ver todos <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="rows-list">
                    {currentExpenses.slice(0, 4).map((e) => (
                      <div className="list-row" key={e.id}>
                        <span className="row-icon">
                          <ReceiptText size={18} />
                        </span>
                        <div className="row-main">
                          <strong>{e.description}</strong>
                          <small>
                            {e.category} · {formatDate(e.date)}
                          </small>
                        </div>
                        <strong className="expense-number">-{formatMoney(e.amountCents)}</strong>
                      </div>
                    ))}
                    {!currentExpenses.length && <p>Nenhum lançamento neste mês.</p>}
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "Despesas" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Lançamentos do período</h2>
                  <p>Despesas diretas e compras no cartão, sem duplicar faturas</p>
                </div>
                <input
                  aria-label="Buscar despesas"
                  placeholder="Buscar descrição ou categoria"
                  className="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Responsável</th>
                      <th>Origem</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentExpenses.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <strong>{e.description}</strong>
                        </td>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.category}</td>
                        <td>{e.payer || "—"}</td>
                        <td>{e.source === "direct" ? "Direta" : "Cartão"}</td>
                        <td className="amount">{formatMoney(e.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!currentExpenses.length && (
                  <div className="empty">Nenhum lançamento encontrado.</div>
                )}
              </div>
            </section>
          )}

          {view === "Contas" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Contas e vencimentos</h2>
                  <p>Quitações simuladas não alteram a planilha real</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Conta</th>
                      <th>Vencimento</th>
                      <th>Valor previsto</th>
                      <th>Status</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBills.map((b) => {
                      const state = billState(b, asOf);
                      return (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.description}</strong>
                          </td>
                          <td>{formatDate(b.dueDate)}</td>
                          <td>
                            {b.plannedCents === null
                              ? "Não informado"
                              : formatMoney(b.plannedCents)}
                          </td>
                          <td>
                            <span className={"status status-" + state}>
                              {state === "paid"
                                ? "Pago"
                                : state === "overdue"
                                  ? "Vencido"
                                  : state === "cancelled"
                                    ? "Cancelado"
                                    : "Pendente"}
                            </span>
                          </td>
                          <td>
                            {dataMode === "demo" && (state === "pending" || state === "overdue") ? (
                              <button className="small-action" onClick={() => markPaid(b.id)}>
                                Marcar paga (demo)
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!visibleBills.length && <div className="empty">Nenhuma conta neste mês.</div>}
              </div>
            </section>
          )}

          {view === "Calendário" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Pré-visualização do calendário</h2>
                  <p>Nenhum evento foi criado ou sincronizado</p>
                </div>
                <span className="status status-pending">Integração desativada</span>
              </div>
              <div className="rows-list">
                {calendarPreview(visibleBills).map((item) => (
                  <div className="list-row" key={item.billId}>
                    <span className="row-icon">
                      <CalendarDays size={18} />
                    </span>
                    <div className="row-main">
                      <strong>{item.title}</strong>
                      <small>{formatDate(item.date)}</small>
                    </div>
                    <span className="chip">Criaria evento</span>
                  </div>
                ))}
                {!visibleBills.length && (
                  <div className="empty">Sem vencimentos para pré-visualizar.</div>
                )}
              </div>
              <p className="panel-note">
                A sincronização Google Calendar exige autorização separada, revisão dos eventos
                existentes e persistência segura dos identificadores.
              </p>
            </section>
          )}

          {view === "Relatórios" && (
            <div className="main-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Resumo do período</h2>
                    <p>Métricas calculadas a partir de lançamentos fictícios</p>
                  </div>
                </div>
                <div className="report-total">
                  <span>Despesas registradas</span>
                  <strong>{formatMoney(summary.totalCents)}</strong>
                </div>
                <div className="report-total">
                  <span>Quantidade de lançamentos</span>
                  <strong>{summary.transactionCount}</strong>
                </div>
                <div className="report-total">
                  <span>Contas pendentes previstas</span>
                  <strong>{formatMoney(summary.pendingCents)}</strong>
                </div>
                <div className="report-total">
                  <span>Variação mensal</span>
                  <strong>{percentDelta === null ? "Indisponível" : percentDelta + "%"}</strong>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Variações por categoria</h2>
                    <p>Dados e premissas verificáveis</p>
                  </div>
                </div>
                <div className="rows-list">
                  {spendingInsights(expenses, month)
                    .slice(0, 5)
                    .map((item) => (
                      <div className="list-row" key={item.category}>
                        <span className="row-icon">
                          <ArrowUpRight size={18} />
                        </span>
                        <div className="row-main">
                          <strong>{item.category}</strong>
                          <small>Comparado ao mês anterior</small>
                        </div>
                        <strong>+{item.increasePercent}%</strong>
                      </div>
                    ))}
                  {!spendingInsights(expenses, month).length && (
                    <p>Sem aumentos comparáveis identificados.</p>
                  )}
                </div>
                <p className="panel-note">Variação não indica, por si só, despesa desnecessária.</p>
              </section>
            </div>
          )}

          {view === "Orçamentos" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Limites por categoria</h2>
                  <p>Altere os valores para testar o planejamento nesta sessão</p>
                </div>
              </div>
              <div className="budget-grid">
                {summary.budgetUse.map((b) => {
                  const percent =
                    b.limitCents === 0
                      ? b.spentCents > 0
                        ? 100
                        : 0
                      : Math.round((b.spentCents / b.limitCents) * 100);
                  return (
                    <div className="budget-card" key={b.category}>
                      <div className="budget-top">
                        <strong>{b.category}</strong>
                        <span className={percent > 100 ? "over-label" : ""}>{percent}%</span>
                      </div>
                      <div className="progress">
                        <span style={{ width: Math.min(100, percent) + "%" }} />
                      </div>
                      <div className="budget-bottom">
                        <span>{formatMoney(b.spentCents)} utilizados</span>
                        <span>{formatMoney(b.limitCents)} limite</span>
                      </div>
                      <label className="budget-edit">
                        Novo limite (R$){" "}
                        <input
                          key={b.category + "-" + b.limitCents}
                          defaultValue={(b.limitCents / 100).toFixed(2).replace(".", ",")}
                          aria-label={"Orçamento " + b.category}
                          onBlur={(e) => editBudget(b.category, e.target.value)}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {view === "Configurações" && (
            <div className="main-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Integrações</h2>
                    <p>Ambiente público e seguro</p>
                  </div>
                </div>
                <GoogleConnector onLoad={showReadOnlyWorkbook} onDisconnect={restoreDemo} />
                <div className="settings-row">
                  <span>
                    <strong>Google Calendar</strong>
                    <small>Sincronização desligada por padrão</small>
                  </span>
                  <span className="status status-pending">Desativado</span>
                </div>
                <div className="settings-row">
                  <span>
                    <strong>Modo demonstrativo</strong>
                    <small>{dataMode === "demo" ? "Dados fictícios nesta sessão" : "Desligado durante a leitura Google"}</small>
                  </span>
                  <span className={"status " + (dataMode === "demo" ? "status-paid" : "status-pending")}>{dataMode === "demo" ? "Ativo" : "Inativo"}</span>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Privacidade</h2>
                    <p>Isolamento de dados e sessão</p>
                  </div>
                </div>
                <p className="settings-copy">
                  Nenhuma alteração é enviada ao Google. Quando configurada, a sessão fica no servidor
                  e a consulta é somente leitura. O cache offline contém apenas recursos públicos de
                  interface. Dados carregados não são mantidos no armazenamento do navegador.
                </p>
                <button
                  className="secondary-action"
                  onClick={restoreDemo}
                >
                  <RefreshCcw size={17} /> Restaurar demonstração
                </button>
              </section>
            </div>
          )}
          <footer>Personal Finance Hub · Open source · {dataMode === "demo" ? "Dados demonstrativos" : "Google somente leitura"} · BRL</footer>
        </main>
      </div>
      {showForm && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowForm(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Nova despesa de demonstração"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>Nova despesa</h2>
              <button aria-label="Fechar formulário" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <p>Adicione uma transação fictícia. Nada será salvo no Google Sheets.</p>
            <form onSubmit={addDemoExpense}>
              <label>
                Descrição
                <input
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Mercado Exemplo"
                />
              </label>
              <div className="form-grid">
                <label>
                  Valor (R$)
                  <input
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="89,90"
                    inputMode="decimal"
                  />
                </label>
                <label>
                  Data
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Categoria
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="button-primary modal-submit">
                <Plus size={18} /> Adicionar na demo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
