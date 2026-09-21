import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  ScanLine,
  FileSpreadsheet,
  FileCheck2,
  ChevronRight,
  CheckCircle2,
  X,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAccounting } from '../../context/AccountingContext';
import { useAppSelector } from '../../app/hooks';
import { formatINR, formatDate } from '../../utils/formatters';
import { Transaction } from '../../types';

interface DashboardViewProps {
  navigate: (route: string) => void;
}

// Every number on this dashboard is derived from real backend data already
// loaded into Redux (invoices, expenses, customers, vendors, journal entries,
// categories) via the AccountingContext metrics/derived lists. There are NO
// hardcoded accounting figures: when a series has no data the chart/table
// shows an explicit empty state instead of a fabricated trend.
export const DashboardView: React.FC<DashboardViewProps> = ({ navigate }) => {
  const { currentOrg, metrics, invoices, expenses, customers, reviewItems } = useAccounting();
  const journalState = useAppSelector((state) => state.journalEntries);
  const categoriesState = useAppSelector((state) => state.categories);
  const [chartPeriod, setChartPeriod] = useState<'Monthly' | 'Quarterly'>('Monthly');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // ── Recent ledger activity (real journal entries, fall back to mapped
  // invoices/expenses when the ledger module has not been opened yet) ──
  type LedgerRow = {
    id: string;
    date: string;
    description: string;
    type: string;
    amount: number;
    status: string;
  };

  const recentTransactions = useMemo<LedgerRow[]>(() => {
    const fromJournal = journalState.items.map((je: any) => ({
      id: je.id as string,
      date: (je.entryDate ?? je.createdAt ?? '') as string,
      description: (je.description || 'Journal entry') as string,
      type: 'Journal',
      amount: Number(
        (je.lines ?? []).reduce(
          (s: number, l: any) => s + Number(l.debitAmount ?? 0),
          0,
        ),
      ),
      status: String(je.status ?? 'DRAFT'),
    }));

    const fromInvoices = invoices.map((inv) => ({
      id: inv.id,
      date: inv.date,
      description: `Invoice ${inv.invoiceNumber} — ${inv.customerName}`,
      type: 'Invoice',
      amount: inv.totalAmount,
      status: inv.apiStatus ?? inv.status,
    }));

    const fromExpenses = expenses.map((exp) => ({
      id: exp.id,
      date: exp.date,
      description: exp.description || `Expense ${exp.category}`,
      type: 'Expense',
      amount: exp.amount,
      status: exp.status,
    }));

    return [...fromJournal, ...fromInvoices, ...fromExpenses]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);
  }, [journalState.items, invoices, expenses]);

  // ── Action Required — derived strictly from real entity states ──
  const overdueInvoiceList = invoices.filter(
    (i) =>
      Boolean(i.dueDate) &&
      i.dueDate < new Date().toISOString().slice(0, 10) &&
      (i.apiStatus === 'FINALIZED' || i.apiStatus === 'PARTIALLY_PAID'),
  );
  const draftInvoicesCount = invoices.filter((i) => i.apiStatus === 'DRAFT').length;
  const pendingExpensesCount = expenses.filter(
    (e) => e.status === 'Pending' || e.status === 'Needs Review',
  ).length;

  const actionItems = [
    ...(overdueInvoiceList.length > 0
      ? [
          {
            id: 'act_overdue',
            title: `${overdueInvoiceList.length} overdue customer invoice${overdueInvoiceList.length > 1 ? 's' : ''}`,
            impact: `${formatINR(
              overdueInvoiceList.reduce((sum, inv) => sum + inv.totalAmount, 0),
              false,
            )} pending past payment credit terms`,
            severity: 'high',
            route: '/sales',
            tag: 'Receivables',
          },
        ]
      : []),
    ...(metrics.pendingReviewCount > 0
      ? [
          {
            id: 'act_review',
            title: `${metrics.pendingReviewCount} transactions require compliance review`,
            impact: 'Open the review queue to accept or dismiss each item',
            severity: 'high',
            route: '/review',
            tag: 'Review Queue',
          },
        ]
      : []),
    ...(draftInvoicesCount > 0
      ? [
          {
            id: 'act_drafts',
            title: `${draftInvoicesCount} draft invoice${draftInvoicesCount > 1 ? 's' : ''} awaiting finalization`,
            impact: 'Finalize to post the journal entry and issue to the customer',
            severity: 'medium',
            route: '/sales',
            tag: 'Invoicing',
          },
        ]
      : []),
    ...(pendingExpensesCount > 0
      ? [
          {
            id: 'act_expenses',
            title: `${pendingExpensesCount} expense${pendingExpensesCount > 1 ? 's' : ''} awaiting approval`,
            impact: 'Submit, approve, and post drafts from the expense drawer',
            severity: 'low',
            route: '/expenses',
            tag: 'Expenses',
          },
        ]
      : []),
  ];

  // ── Chart 1: Monthly Operating Cash Trend — aggregated from real invoice
  // (inflow proxy: invoiced revenue) and expense (outflow) dates ──
  const monthlyCashTrendData = useMemo(() => {
    const byMonth = new Map<string, { inflow: number; outflow: number }>();
    const keyOf = (date: string) => (date || '').slice(0, 7); // YYYY-MM

    invoices.forEach((inv) => {
      if (inv.apiStatus === 'CANCELLED') return;
      const key = keyOf(inv.date);
      if (!key) return;
      const bucket = byMonth.get(key) ?? { inflow: 0, outflow: 0 };
      bucket.inflow += inv.totalAmount;
      byMonth.set(key, bucket);
    });

    expenses.forEach((exp) => {
      const key = keyOf(exp.date);
      if (!key) return;
      const bucket = byMonth.get(key) ?? { inflow: 0, outflow: 0 };
      bucket.outflow += exp.amount;
      byMonth.set(key, bucket);
    });

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { inflow, outflow }]) => {
        const label = new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        });
        return { month: label, inflow, outflow, netCash: inflow - outflow };
      });
  }, [invoices, expenses]);

  const quarterlyCashTrendData = useMemo(() => {
    const byQuarter = new Map<string, { inflow: number; outflow: number }>();
    const keyOf = (date: string) => {
      const ym = (date || '').slice(0, 7);
      if (!ym) return '';
      const [year, month] = ym.split('-').map(Number);
      // Indian FY quarters: Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar
      const quarter = Math.floor((((month - 4 + 12) % 12)) / 3) + 1;
      return `${year}-Q${quarter}`;
    };

    invoices.forEach((inv) => {
      if (inv.apiStatus === 'CANCELLED') return;
      const key = keyOf(inv.date);
      if (!key) return;
      const bucket = byQuarter.get(key) ?? { inflow: 0, outflow: 0 };
      bucket.inflow += inv.totalAmount;
      byQuarter.set(key, bucket);
    });

    expenses.forEach((exp) => {
      const key = keyOf(exp.date);
      if (!key) return;
      const bucket = byQuarter.get(key) ?? { inflow: 0, outflow: 0 };
      bucket.outflow += exp.amount;
      byQuarter.set(key, bucket);
    });

    return Array.from(byQuarter.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { inflow, outflow }]) => ({
        month: key,
        inflow,
        outflow,
        netCash: inflow - outflow,
      }));
  }, [invoices, expenses]);

  const currentCashTrend =
    chartPeriod === 'Monthly' ? monthlyCashTrendData : quarterlyCashTrendData;

  // ── Chart 2: Revenue vs Expenses by month (real invoice/expense totals) ──
  const revenueExpensesData = monthlyCashTrendData.map((m) => ({
    month: m.month,
    revenue: m.inflow,
    expense: m.outflow,
  }));

  // ── Chart 3: Expense Breakdown — grouped by the real expense categories ──
  const expenseBreakdownData = useMemo(() => {
    const palette = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];
    const byCategory = new Map<string, number>();
    expenses.forEach((exp) => {
      const name = exp.category || 'Other';
      byCategory.set(name, (byCategory.get(name) ?? 0) + exp.amount);
    });
    return Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], idx) => ({ name, value, color: palette[idx % palette.length] }));
  }, [expenses]);

  const totalExpenseVal = expenseBreakdownData.reduce((sum, item) => sum + item.value, 0);

  // ── Dynamic card sub-stats ──
  const pendingInvoiceCount = invoices.filter(
    (i) => i.apiStatus === 'FINALIZED' || i.apiStatus === 'PARTIALLY_PAID',
  ).length;
  const largestExpenseCategory = expenseBreakdownData[0];

  // Custom Tooltip for Area / Bar Charts
  const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 text-white p-3 rounded-xs shadow-xl border border-slate-800 text-xs font-mono">
          <p className="font-bold text-slate-200 mb-1.5 pb-1 border-b border-slate-800 font-sans">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}></span>
                {entry.name}:
              </span>
              <span className="font-bold text-white">{formatINR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Donut Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const pct = totalExpenseVal > 0 ? ((data.value / totalExpenseVal) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-950 text-white p-2.5 rounded-xs shadow-xl border border-slate-800 text-xs font-mono">
          <p className="font-bold text-slate-200 mb-1 font-sans">{data.name}</p>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400 font-sans">Amount:</span>
            <span className="font-bold text-white">{formatINR(data.value)}</span>
          </div>
          <div className="flex justify-between gap-4 text-emerald-400">
            <span className="font-sans">Share:</span>
            <span>{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Row with Greetings & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Overview
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5 font-sans">
            {todayFormatted} • FY {currentOrg?.financialYear || ''}
          </p>
        </div>

        {/* Quick Voucher Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/sales/create-invoice')}
            id="quick-generate-invoice-btn"
            className="px-4 py-2 border border-neutral-900 bg-neutral-900 text-white text-xs font-bold uppercase tracking-widest transition-colors hover:bg-neutral-800 flex items-center gap-1.5 rounded-xs shadow-xs"
          >
            <Plus size={14} />
            <span>Generate Invoice</span>
          </button>
          <button
            onClick={() => navigate('/expenses')}
            id="quick-new-expense-btn"
            className="px-4 py-2 border border-neutral-300 bg-white text-neutral-900 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-neutral-50 flex items-center gap-1.5 rounded-xs"
          >
            <CreditCard size={14} className="text-neutral-500" />
            <span>Create Expense</span>
          </button>
          {/* TODO:
          OCR / Document Ingestion is temporarily disabled.
          Preserve all implementation for future reactivation.
          <button
            onClick={() => navigate('/ai-assistant/documents')}
            id="quick-scan-ocr-btn"
            className="px-4 py-2 border border-neutral-300 bg-white text-neutral-900 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-neutral-50 flex items-center gap-1.5 rounded-xs"
          >
            <ScanLine size={14} className="text-neutral-700" />
            <span>Scan Bill (OCR)</span>
          </button>
          */}
        </div>
      </div>

      {/* Financial Summary Grid (Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-6 border border-neutral-200 rounded-xs">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
            Total Revenue (YTD)
          </p>
          <h3 className="text-2xl font-light text-neutral-900 font-mono">
            {formatINR(metrics.revenue, false)}
          </h3>
          <p className="mt-2 text-[10px] font-bold text-neutral-500 uppercase tracking-tight flex items-center gap-1">
            <TrendingUp size={11} />
            <span>{invoices.length} invoices issued</span>
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-6 border border-neutral-200 rounded-xs">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
            Operating Expenses
          </p>
          <h3 className="text-2xl font-light text-neutral-900 font-mono">
            {formatINR(metrics.expenses, false)}
          </h3>
          <p className="mt-2 text-[10px] font-bold text-neutral-500 uppercase tracking-tight font-mono">
            {largestExpenseCategory
              ? `${largestExpenseCategory.name} leads at ${formatINR(largestExpenseCategory.value, false)}`
              : `${expenses.length} expenses recorded`}
          </p>
        </div>

        {/* Accounts Receivable */}
        <div
          onClick={() => navigate('/sales')}
          className="bg-white p-6 border border-neutral-200 rounded-xs cursor-pointer hover:border-neutral-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              Accounts Receivable
            </p>
            <ChevronRight size={12} className="text-neutral-400" />
          </div>
          <h3 className="text-2xl font-light text-blue-700 font-mono">
            {formatINR(metrics.receivables, false)}
          </h3>
          <p className="mt-2 text-[10px] font-bold text-amber-700 uppercase tracking-tight">
            {pendingInvoiceCount} Invoice{pendingInvoiceCount === 1 ? '' : 's'} Pending
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-6 border border-neutral-200 rounded-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
              Net Position
            </p>
            {metrics.netProfit >= 0 ? (
              <ArrowUpRight size={12} className="text-emerald-600" />
            ) : (
              <ArrowDownRight size={12} className="text-red-600" />
            )}
          </div>
          <h3
            className={`text-2xl font-light font-mono ${
              metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatINR(metrics.netProfit, false)}
          </h3>
          <p className="mt-2 text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
            {customers.length} active customers
          </p>
        </div>
      </div>

      {/* DASHBOARD CHARTS SECTION (2 Responsive Financial Visualizations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Monthly Operating Cash Trend (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-xs p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-100 gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-slate-800" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                  Operating Cash Trend
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Invoiced revenue vs recorded expenses
              </p>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setChartPeriod('Monthly')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-xs transition-colors ${
                  chartPeriod === 'Monthly' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setChartPeriod('Quarterly')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-xs transition-colors ${
                  chartPeriod === 'Quarterly' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Quarterly
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {currentCashTrend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                <BarChart3 size={22} className="text-slate-300" />
                <p className="text-xs font-mono text-slate-400">
                  No invoicing or expense activity yet.
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Create an invoice or record an expense to build this trend.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentCashTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                    width={60}
                  />
                  <Tooltip content={<CustomCurrencyTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 10, fontSize: 11, fontFamily: 'monospace' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    name="Invoiced"
                    stroke="#0f172a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inflowGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    name="Expenses"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#outflowGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Expense Breakdown (Donut Chart - 4 cols) */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xs p-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-neutral-100 mb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon size={15} className="text-slate-800" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
                Expense Breakdown
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              By real expense categories
              {currentOrg?.financialYear ? ` (${currentOrg.financialYear})` : ''}
            </p>
          </div>

          {expenseBreakdownData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
              <PieChartIcon size={22} className="text-slate-300" />
              <p className="text-xs font-mono text-slate-400">No expenses recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Total</span>
                  <span className="text-xs font-bold font-mono text-slate-900">{formatINR(totalExpenseVal, false)}</span>
                </div>
              </div>

              {/* Clean minimal legend list */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
                {expenseBreakdownData.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-slate-600 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-semibold text-slate-900 shrink-0">{formatINR(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid: Transactions Table (Left 2 cols) & Action / Compliance Box (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Ledger Table */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-600">
              Recent Ledger Activity
            </h2>
            <button
              onClick={() => navigate('/transactions')}
              className="text-[10px] text-blue-600 font-bold uppercase tracking-widest cursor-pointer hover:underline"
            >
              View Full Ledger →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-xs font-mono">
                      No ledger activity yet. Create an invoice or expense to get started.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      onClick={() =>
                        setSelectedTransaction({
                          id: tx.id,
                          orgId: currentOrg?.id ?? '',
                          date: tx.date,
                          description: tx.description,
                          type: 'Receipt',
                          partyName: tx.description,
                          partyType: 'Ledger',
                          amount: tx.amount,
                          taxableAmount: tx.amount,
                          gstAmount: 0,
                          gstRate: 0,
                          status: 'Categorized',
                          account: '—',
                        })
                      }
                    >
                      <td className="px-4 py-3 font-mono text-neutral-500 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900 max-w-xs truncate">
                        <div className="truncate font-semibold">{tx.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-xs">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 font-bold uppercase text-[9px] tracking-tight rounded-xs ${
                            tx.status === 'PAID' || tx.status === 'Paid' || tx.status === 'POSTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'DRAFT'
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Chart 2: Revenue vs Expenses Grouped Bar Chart at bottom of table */}
          <div className="p-4 border-t border-neutral-100 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  Monthly Revenue vs Operating Expenses
                </span>
                {currentOrg?.financialYear && (
                  <span className="text-[10px] text-neutral-500 font-mono ml-2">
                    (FY {currentOrg.financialYear})
                  </span>
                )}
              </div>
            </div>
            <div className="h-44 w-full">
              {revenueExpensesData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                  <BarChart3 size={20} className="text-slate-300" />
                  <p className="text-xs font-mono text-slate-400">
                    Not enough ledger activity to chart yet.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueExpensesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                      width={50}
                    />
                    <Tooltip content={<CustomCurrencyTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 6, fontSize: 11, fontFamily: 'monospace' }}
                      iconType="rect"
                      iconSize={10}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#0f172a" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 col: Action Required */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white p-5 border border-neutral-200 rounded-xs flex-1 flex flex-col">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-600 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                <span>Action Required</span>
              </div>
              <span className="text-[10px] font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold">
                {actionItems.length}
              </span>
            </h2>

            <div className="space-y-4 flex-1">
              {actionItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <p className="text-xs font-mono text-slate-400">
                    Nothing needs attention right now.
                  </p>
                </div>
              ) : (
                actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="pr-3">
                      <p className="text-xs font-bold text-neutral-900">{item.title}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{item.impact}</p>
                    </div>
                    <button
                      onClick={() => navigate(item.route)}
                      className="text-[10px] font-bold text-blue-600 uppercase hover:underline shrink-0"
                    >
                      Resolve
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-neutral-100">
              <button
                onClick={() => navigate('/review')}
                className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-neutral-950 w-full text-center"
              >
                Open Compliance Queue →
              </button>
            </div>
          </div>

          {/* Compliance & Audit Insight Accent Block */}
          <div className="bg-neutral-900 p-5 text-white rounded-xs flex-shrink-0 border border-neutral-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 flex items-center gap-1.5">
              <FileSpreadsheet size={12} className="text-emerald-400" />
              <span>Statutory Compliance Intelligence</span>
            </p>
            <p className="text-xs leading-relaxed text-neutral-300 font-sans">
              {metrics.gstNetPayable > 0
                ? `Estimated net GST payable of ${formatINR(metrics.gstNetPayable, false)} is accumulating this period. Review the GST hub before filing.`
                : 'No net GST liability is currently accumulating on recorded activity.'}
            </p>
            <button
              onClick={() => navigate('/gst')}
              className="mt-3 text-[9px] font-bold uppercase tracking-widest border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800 text-neutral-200 transition-colors inline-block rounded-xs"
            >
              Open GST Hub →
            </button>
          </div>
        </div>
      </div>

      {/* Simple detail drawer for ledger rows (no fake journal lines) */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setSelectedTransaction(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 xs:pl-6 sm:pl-10">
            <div className="w-screen max-w-full xs:max-w-md bg-white shadow-2xl border-l border-neutral-200 flex flex-col">
              <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900 font-mono">
                    Ledger Entry Detail
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {formatDate(selectedTransaction.date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors rounded-xs"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xs">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Total Amount
                  </div>
                  <div className="text-2xl font-light font-mono text-neutral-900 mt-1">
                    {formatINR(selectedTransaction.amount)}
                  </div>
                  <div className="mt-1 text-neutral-600 text-xs">
                    {selectedTransaction.description}
                  </div>
                </div>
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-500 font-sans">Record Type:</span>
                    <span className="font-bold text-neutral-900">{selectedTransaction.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-500 font-sans">Status:</span>
                    <span className="text-neutral-900 font-semibold">{selectedTransaction.status}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Full double-entry details are available in Transactions → Journal.
                </p>
              </div>

              <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-widest w-full transition-colors rounded-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
