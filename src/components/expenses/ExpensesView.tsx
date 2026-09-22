import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  AlertCircle,
  X,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Eye,
  Send,
  ShieldCheck,
  Ban,
  RotateCcw,
  Banknote,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchCategories } from '../../features/categories/categoriesSlice';
import { fetchAccounts } from '../../features/accounts/accountsSlice';
import {
  fetchExpenses,
  fetchExpenseById,
  createExpense,
  submitExpense,
  approveExpense,
  postExpense,
  reverseExpense,
  cancelExpense,
} from '../../features/expenses/expensesSlice';
import type {
  Expense,
  ExpenseStatus,
  CreateExpenseDto,
  CreateExpenseItemDto,
} from '../../api/expensesTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { formatINR, formatDate } from '../../utils/formatters';

interface ExpensesViewProps {
  navigate: (route: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ navigate }) => {
  // Vendors come from AccountingContext (which maps the vendors Redux slice
  // onto the legacy UI shape); they are real backend data, not mock.
  const { vendors } = useAccounting();
  const dispatch = useAppDispatch();
  const expensesState = useAppSelector((state) => state.expenses);
  const categoriesState = useAppSelector((state) => state.categories);
  const accountsState = useAppSelector((state) => state.accounts);
  const activeOrganizationId = useAppSelector(
    (state) => state.organizations.activeOrganizationId,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [refreshTick, setRefreshTick] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  // Async feedback + duplicate-submission guard (component-local, matching the
  // purchases / vendor-payments views).
  const [expenseBusy, setExpenseBusy] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState('');
  const [expenseSuccess, setExpenseSuccess] = useState('');

  // ── Create form state ─────────────────────────────────────────────
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [tdsDeducted, setTdsDeducted] = useState(false);
  const [tdsRate, setTdsRate] = useState('10');

  // ── Post action state (in the expense drawer) ─────────────────────
  const [postPaid, setPostPaid] = useState(false);
  const [postAccountId, setPostAccountId] = useState('');

  // Backend-driven master data. Fetch on mount / tenant switch / refresh;
  // the TenantAccessGuard rejects any request without x-organization-id, so
  // wait for an active organization.
  useEffect(() => {
    if (activeOrganizationId) {
      dispatch(fetchExpenses());
    }
  }, [activeOrganizationId, refreshTick, dispatch]);

  useEffect(() => {
    if (activeOrganizationId) {
      dispatch(fetchCategories({ page: 1, limit: 100 }));
    }
  }, [activeOrganizationId, dispatch]);
  // When the Record Expense modal opens, make sure categories are available:
  // fetch if idle or failed (e.g. after a temporary server restart).
  useEffect(() => {
    if (!isModalOpen || !activeOrganizationId) return;
    if (categoriesState.listStatus === 'succeeded' || categoriesState.listStatus === 'loading') return;
    dispatch(fetchCategories({ page: 1, limit: 100 }));
  }, [isModalOpen, activeOrganizationId, categoriesState.listStatus, dispatch]);


  useEffect(() => {
    if (activeOrganizationId && accountsState.status === 'idle') {
      dispatch(fetchAccounts());
    }
  }, [activeOrganizationId, accountsState.status, dispatch]);
  // "View expense" → GET /expenses/:id to refresh items/status; the fulfilled
  // case upserts into the list so the drawer re-renders with fresh data.
  useEffect(() => {
    if (selectedExpenseId) {
      dispatch(fetchExpenseById(selectedExpenseId));
    }
  }, [selectedExpenseId, dispatch]);

  const categoryOptions = useMemo(
    () => categoriesState.list.filter((c) => (c.type ?? '').toUpperCase() !== 'INCOME'),
    [categoriesState.list],
  );
  // If the user opened the modal before categories finished loading, select the
  // first real category once options arrive so the form is immediately valid.
  useEffect(() => {
    if (isModalOpen && !categoryId && categoryOptions.length > 0) {
      setCategoryId(categoryOptions[0].id);
    }
  }, [isModalOpen, categoryId, categoryOptions]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categoriesState.list.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categoriesState.list]);

  const vendorById = useMemo(() => {
    const map = new Map<string, { name: string; gstin?: string }>();
    vendors.forEach((v) => map.set(v.id, { name: v.name, gstin: v.gstin }));
    return map;
  }, [vendors]);

  const vendorLabel = (exp: Expense): string =>
    exp.vendorNameSnapshot ||
    (exp.vendorId ? vendorById.get(exp.vendorId)?.name : undefined) ||
    'Direct Payment';

  const vendorGstinLabel = (exp: Expense): string =>
    exp.vendorGstinSnapshot ||
    (exp.vendorId ? vendorById.get(exp.vendorId)?.gstin : undefined) ||
    '';

  const selectedExpense: Expense | null = selectedExpenseId
    ? (expensesState.selected && expensesState.selected.id === selectedExpenseId
      ? expensesState.selected
      : expensesState.items.find((e) => e.id === selectedExpenseId) ?? null)
    : null;

  // ── Derived metrics (server-computed totals; the frontend never recomputes
  // accounting effects itself) ──────────────────────────────────────────
  const totalGrandTotal = expensesState.items.reduce((s, e) => s + Number(e.grandTotal), 0);
  const totalTax = expensesState.items.reduce((s, e) => s + Number(e.taxTotal), 0);
  const totalTds = expensesState.items.reduce((s, e) => s + Number(e.tdsAmount || 0), 0);
  const payrollTotal = expensesState.items
    .filter((e) => /salar|wage|payroll/i.test(categoryNameById.get(e.categoryId) || ''))
    .reduce((s, e) => s + Number(e.grandTotal), 0);
  const payrollPct = totalGrandTotal > 0 ? Math.round((payrollTotal / totalGrandTotal) * 100) : 0;

  const filterCategoryNames = categoryOptions.map((c) => c.name);

  const filteredExpenses = expensesState.items.filter((exp) => {
    const catName = categoryNameById.get(exp.categoryId) || '';
    if (categoryFilter !== 'All' && catName !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (exp.items?.[0]?.description || '').toLowerCase();
      return (
        exp.expenseNumber.toLowerCase().includes(q) ||
        desc.includes(q) ||
        vendorLabel(exp).toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusBadgeClass = (status: ExpenseStatus): string => {
    switch (status) {
      case 'POSTED':
        return 'bg-emerald-100 text-emerald-900';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-900';
      case 'SUBMITTED':
        return 'bg-amber-100 text-amber-900';
      case 'REJECTED':
      case 'CANCELLED':
      case 'REVERSED':
        return 'bg-red-100 text-red-900';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const openCreateModal = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setCategoryId(categoryOptions[0]?.id || '');
    setDescription('');
    setVendorId('');
    setAmount('');
    setGstRate('18');
    setTdsDeducted(false);
    setTdsRate('10');
    setExpenseError('');
    setExpenseSuccess('');
    setIsModalOpen(true);
  };

  const openExpenseDrawer = (id: string) => {
    setSelectedExpenseId(id);
    setExpenseError('');
    setExpenseSuccess('');
    setPostPaid(false);
    setPostAccountId('');
    dispatch(fetchExpenseById(id));
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseBusy) return;
    if (!categoryId) {
      setExpenseError('Select an expense category before saving.');
      return;
    }
    const gross = parseFloat(amount);
    if (!gross || gross <= 0) {
      setExpenseError('Enter an expense amount greater than zero.');
      return;
    }
    const rate = parseFloat(gstRate) || 0;
    // The backend recomputes all totals server-side from quantity × unitPrice
    // (+ tax), so send the tax-exclusive base for a tax-inclusive form input.
    const base = Math.round((gross / (1 + rate / 100)) * 100) / 100;

    const item: CreateExpenseItemDto = {
      description: description.trim() || 'Expense',
      quantity: 1,
      unitPrice: base,
      taxRate: rate,
    };
    const payload: CreateExpenseDto = {
      expenseDate: date,
      categoryId,
      items: [item],
      ...(vendorId ? { vendorId } : {}),
      ...(description.trim() ? { notes: description.trim() } : {}),
      ...(tdsDeducted ? { tdsApplicable: true, tdsRate: parseFloat(tdsRate) || 0 } : {}),
    };

    setExpenseBusy('create');
    setExpenseError('');
    try {
      const created = await dispatch(createExpense(payload)).unwrap();
      setIsModalOpen(false);
      setExpenseSuccess(`Expense ${created.expenseNumber} saved as DRAFT.`);
      setDescription('');
      setVendorId('');
      setAmount('');
    } catch (err) {
      setExpenseError(getApiErrorMessage(err, 'Failed to create the expense.'));
    } finally {
      setExpenseBusy(null);
    }
  };

  const handleSubmitExpense = async (exp: Expense) => {
    if (expenseBusy) return;
    setExpenseBusy('submit');
    setExpenseError('');
    try {
      await dispatch(submitExpense(exp.id)).unwrap();
      setExpenseSuccess(`Expense ${exp.expenseNumber} submitted for approval.`);
    } catch (err) {
      setExpenseError(getApiErrorMessage(err, 'Failed to submit the expense.'));
    } finally {
      setExpenseBusy(null);
    }
  };

  const handleApproveExpense = async (exp: Expense) => {
    if (expenseBusy) return;
    setExpenseBusy('approve');
    setExpenseError('');
    try {
      await dispatch(approveExpense(exp.id)).unwrap();
      setExpenseSuccess(`Expense ${exp.expenseNumber} approved.`);
    } catch (err) {
      setExpenseError(getApiErrorMessage(err, 'Failed to approve the expense.'));
    } finally {
      setExpenseBusy(null);
    }
  };

  const handlePostExpense = async (exp: Expense) => {
    if (expenseBusy) return;
    if (postPaid && !postAccountId) {
      setExpenseError('Select the bank/cash account to pay from before posting.');
      return;
    }
    setExpenseBusy('post');
    setExpenseError('');
    try {
      await dispatch(
        postExpense({
          id: exp.id,
          paid: postPaid,
          paymentAccountId: postPaid ? postAccountId : undefined,
        }),
      ).unwrap();
      setExpenseSuccess(
        `Expense ${exp.expenseNumber} posted${postPaid ? ' and paid' : ''} to the ledger.`,
      );
    } catch (err) {
      setExpenseError(getApiErrorMessage(err, 'Failed to post the expense.'));
    } finally {
      setExpenseBusy(null);
    }
  };

  const handleReverseExpense = async (exp: Expense) => {
    if (expenseBusy) return;
    if (!window.confirm(`Reverse expense ${exp.expenseNumber}? Its journal entry will be reversed.`)) return;
    setExpenseBusy('reverse');
    setExpenseError('');
    try {
      await dispatch(reverseExpense(exp.id)).unwrap();
      setExpenseSuccess(`Expense ${exp.expenseNumber} reversed (journal entry reversed).`);
    } catch (err) {
      setExpenseError(getApiErrorMessage(err, 'Failed to reverse the expense.'));
    } finally {
      setExpenseBusy(null);
    }
  };

  const handleCancelExpense = async (exp: Expense) => {
    if (expenseBusy) return;
    if (!window.confirm(`Cancel expense ${exp.expenseNumber}?`)) return;
    setExpenseBusy('cancel');
    setExpenseError('');
    try {
      await dispatch(cancelExpense(exp.id)).unwrap();
      setExpenseSuccess(`Expense ${exp.expenseNumber} cancelled.`);
    } catch (err) {
      setExpenseError(getApiErrorMessage(err, 'Failed to cancel the expense.'));
    } finally {
      setExpenseBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight">
            Operating & Administrative Expenses
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Track business overheads, operational costs, TDS withholdings, and payment accounts
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="record-expense-btn"
          className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors"
        >
          <Plus size={14} />
          <span>Record Business Expense</span>
        </button>
      </div>

      {/* Expense Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Operational Outflow
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(totalGrandTotal, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            {expensesState.items.length} voucher records
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Payroll & Retainers
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(payrollTotal, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            {payrollPct}% of OpEx
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            GST ITC on Expenses
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1.5">
            {formatINR(totalTax, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-emerald-700">
            Eligible Input Tax Credit
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            TDS Withheld (Payable)
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(totalTds, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            Due by 7th next month
          </div>
        </div>
      </div>

      {/* Filter Category & Search */}
      <div className="bg-white border border-slate-200 rounded-xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 relative max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by vendor or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xs bg-white text-slate-800 focus:outline-none"
            >
              <option value="All">All Expense Heads</option>
              {filterCategoryNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredExpenses.length} expense vouchers
          </div>
          <button
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={expensesState.status === 'loading'}
            className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xs flex items-center gap-1.5"
          >
            <RefreshCw
              size={13}
              className={expensesState.status === 'loading' ? 'animate-spin' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>

        {(categoriesState.listStatus === 'loading' || accountsState.status === 'loading') && (
          <div className="text-[10px] font-mono text-slate-500">
            Loading categories & ledger accounts from server…
          </div>
        )}
        {(categoriesState.listStatus === 'failed' || accountsState.status === 'failed') && (
          <div className="text-[10px] font-mono text-red-600">
            Could not load categories or accounts
            {categoriesState.error?.message || accountsState.error
              ? ` (${categoriesState.error?.message ?? accountsState.error})`
              : ''}
            .
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="p-4 space-y-3">
          {expensesState.error && expensesState.items.length === 0 && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle size={13} />
                {getApiErrorMessage({ message: expensesState.error }, 'Failed to load expenses.')}
              </span>
              <button
                onClick={() => setRefreshTick((t) => t + 1)}
                className="px-2 py-0.5 border border-red-300 rounded-xs text-red-900 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}
          {expenseError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><AlertCircle size={13} />{expenseError}</span>
              <button onClick={() => setExpenseError('')} className="p-0.5 hover:text-red-950" title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}
          {expenseSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><CheckCircle2 size={13} />{expenseSuccess}</span>
              <button onClick={() => setExpenseSuccess('')} className="p-0.5 hover:text-emerald-950" title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left swiss-table border-collapse">
              <thead>
                <tr>
                  <th className="w-24">Date</th>
                  <th className="w-28">Expense No</th>
                  <th>Expense Head / Category</th>
                  <th>Description</th>
                  <th>Vendor / Payee</th>
                  <th className="text-right w-24">GST Tax</th>
                  <th className="text-right w-28">Amount</th>
                  <th className="text-center w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {expensesState.status === 'loading' && expensesState.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading expenses...
                    </td>
                  </tr>
                ) : expensesState.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs font-mono">
                      No expenses yet. Use “Record Business Expense” to create one.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      onClick={() => openExpenseDrawer(exp.id)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-mono text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(exp.expenseDate)}
                      </td>
                      <td className="font-mono font-bold text-slate-900 whitespace-nowrap">
                        {exp.expenseNumber}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-800 rounded-xs">
                          {categoryNameById.get(exp.categoryId) || '—'}
                        </span>
                      </td>
                      <td className="font-medium text-slate-900 text-xs">
                        {exp.items?.[0]?.description || exp.expenseNumber}
                      </td>
                      <td className="text-slate-700 text-xs">
                        <div>{vendorLabel(exp)}</div>
                        {vendorGstinLabel(exp) && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            GSTIN: {vendorGstinLabel(exp)}
                          </div>
                        )}
                      </td>
                      <td className="text-right font-mono text-slate-600 whitespace-nowrap text-xs">
                        {Number(exp.taxTotal) > 0 ? formatINR(Number(exp.taxTotal)) : '—'}
                      </td>
                      <td className="text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                        {formatINR(Number(exp.grandTotal))}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-semibold ${statusBadgeClass(exp.status)}`}>
                          {exp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Expense Modal (POST /api/v1/expenses via dispatch) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Record Business Expense Voucher
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Creates a DRAFT expense — submit, approve & post it from the expense drawer
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Expense Head / Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white"
                  >
                    {(categoriesState.listStatus === 'loading' ||
                      (categoriesState.listStatus === 'idle' && categoryOptions.length === 0)) && (
                        <option value="">Loading categories…</option>
                      )}
                    {categoriesState.listStatus === 'failed' && (
                      <option value="">Unable to load categories</option>
                    )}
                    {categoriesState.listStatus === 'succeeded' && categoryOptions.length === 0 && (
                      <option value="">No expense categories available - add one in Catalog</option>
                    )}
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categoriesState.listStatus === 'failed' && (
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-mono text-red-600">
                      <span>{categoriesState.error?.message || 'Could not load categories.'}</span>
                      <button
                        type="button"
                        onClick={() => dispatch(fetchCategories({ page: 1, limit: 100 }))}
                        className="underline text-slate-700 hover:text-slate-900"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Description / Narration *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly server hosting fees for ERP infrastructure"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Vendor / Payee (Optional)
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white"
                  >
                    <option value="">— Direct Payment —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Total Expense Amount (INR ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    GST Rate
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900 bg-white"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    TDS Rate
                  </label>
                  <select
                    value={tdsRate}
                    onChange={(e) => setTdsRate(e.target.value)}
                    disabled={!tdsDeducted}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900 bg-white disabled:opacity-50"
                  >
                    <option value="1">1% (194C)</option>
                    <option value="2">2% (194C)</option>
                    <option value="10">10% (194J)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xs">
                <input
                  type="checkbox"
                  id="tds-check"
                  checked={tdsDeducted}
                  onChange={(e) => setTdsDeducted(e.target.checked)}
                  className="rounded-xs text-slate-900 focus:ring-0"
                />
                <label htmlFor="tds-check" className="font-mono text-slate-800 cursor-pointer">
                  TDS Deducted on this expense (backend computes the withholding)
                </label>
              </div>

              {expenseError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center gap-2">
                  <AlertCircle size={13} />{expenseError}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseBusy !== null || !categoryId}
                  className="px-5 py-2 bg-slate-950 disabled:opacity-50 text-white hover:bg-slate-800 rounded-xs font-semibold flex items-center gap-2"
                >
                  {expenseBusy === 'create' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <span>Save Draft Expense</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense View Drawer (lifecycle actions gated by backend status) */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xs"
            onClick={() => setSelectedExpenseId(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 xs:pl-6 sm:pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                    Expense • {selectedExpense.expenseNumber}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatDate(selectedExpense.expenseDate)} • {selectedExpense.status}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedExpenseId(null)}
                  className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">
                    Total Expense Value
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-950 mt-1">
                    {formatINR(Number(selectedExpense.grandTotal))}
                  </div>
                  <div className="mt-1 text-slate-600 text-xs font-semibold">
                    {categoryNameById.get(selectedExpense.categoryId) || '—'}
                  </div>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Vendor / Payee:</span>
                    <span className="font-bold text-slate-900">{vendorLabel(selectedExpense)}</span>
                  </div>
                  {vendorGstinLabel(selectedExpense) && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-sans">Vendor GSTIN:</span>
                      <span className="font-bold text-slate-900">{vendorGstinLabel(selectedExpense)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Taxable Base:</span>
                    <span className="text-slate-900">{formatINR(Number(selectedExpense.subtotal))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">GST Tax:</span>
                    <span className="text-slate-900">{formatINR(Number(selectedExpense.taxTotal))}</span>
                  </div>
                  {selectedExpense.tdsAmount != null && Number(selectedExpense.tdsAmount) > 0 && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-sans">TDS Withheld:</span>
                      <span className="font-bold text-slate-900">
                        {formatINR(Number(selectedExpense.tdsAmount))}
                      </span>
                    </div>
                  )}
                  {selectedExpense.journalEntryId && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-sans">Journal Entry:</span>
                      <span className="text-slate-900 font-mono text-[10px] max-w-[180px] truncate">
                        {selectedExpense.journalEntryId}
                      </span>
                    </div>
                  )}
                </div>

                {selectedExpense.items && selectedExpense.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-[11px] font-bold uppercase font-mono text-slate-500 mb-2">
                      Line Items
                    </div>
                    <div className="space-y-2">
                      {selectedExpense.items.map((it) => (
                        <div
                          key={it.id}
                          className="bg-slate-50 border border-slate-200 rounded-xs p-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {it.description || 'Expense item'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {Number(it.quantity)} × {formatINR(Number(it.unitPrice))} @ {Number(it.taxRate)}%
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-950">
                            {formatINR(Number(it.lineTotal))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                {expenseError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><AlertCircle size={13} />{expenseError}</span>
                    <button onClick={() => setExpenseError('')} className="p-0.5 hover:text-red-950" title="Dismiss">
                      <X size={13} />
                    </button>
                  </div>
                )}
                {expenseSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><CheckCircle2 size={13} />{expenseSuccess}</span>
                    <button onClick={() => setExpenseSuccess('')} className="p-0.5 hover:text-emerald-950" title="Dismiss">
                      <X size={13} />
                    </button>
                  </div>
                )}

                {selectedExpense.status === 'DRAFT' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleSubmitExpense(selectedExpense)}
                      disabled={expenseBusy !== null}
                      className="px-3 py-1.5 bg-slate-900 disabled:opacity-50 text-white hover:bg-slate-800 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                      title="Submit the DRAFT expense for approval"
                    >
                      {expenseBusy === 'submit' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>Submit for Approval</span>
                    </button>
                    <button
                      onClick={() => handleCancelExpense(selectedExpense)}
                      disabled={expenseBusy !== null}
                      className="px-3 py-1.5 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                      title="Cancel the DRAFT expense"
                    >
                      {expenseBusy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

                {selectedExpense.status === 'SUBMITTED' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleApproveExpense(selectedExpense)}
                      disabled={expenseBusy !== null}
                      className="px-3 py-1.5 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                      title="Approve the submitted expense"
                    >
                      {expenseBusy === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleCancelExpense(selectedExpense)}
                      disabled={expenseBusy !== null}
                      className="px-3 py-1.5 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                      title="Cancel the submitted expense"
                    >
                      {expenseBusy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

                {selectedExpense.status === 'APPROVED' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-700">
                      <input
                        type="checkbox"
                        checked={postPaid}
                        onChange={(e) => setPostPaid(e.target.checked)}
                        className="rounded-xs text-slate-900 focus:ring-0"
                      />
                      Paid now (else posts to Accounts Payable)
                    </label>
                    {postPaid && (
                      <select
                        value={postAccountId}
                        onChange={(e) => setPostAccountId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xs bg-white font-medium focus:outline-none focus:border-slate-900"
                      >
                        <option value="">— select bank/cash account —</option>
                        {accountsState.items
                          .filter((a) => (a.accountType ?? '') === 'ASSET')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code ? `${a.code} — ` : ''}
                              {a.name}
                            </option>
                          ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handlePostExpense(selectedExpense)}
                        disabled={expenseBusy !== null}
                        className="px-3 py-1.5 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                        title="Post the approved expense: books the double-entry journal"
                      >
                        {expenseBusy === 'post' ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={13} />}
                        <span>Post to Ledger</span>
                      </button>
                      <button
                        onClick={() => handleCancelExpense(selectedExpense)}
                        disabled={expenseBusy !== null}
                        className="px-3 py-1.5 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                        title="Cancel the approved expense"
                      >
                        {expenseBusy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedExpense.status === 'POSTED' && (
                  <button
                    onClick={() => handleReverseExpense(selectedExpense)}
                    disabled={expenseBusy !== null}
                    className="w-full py-2 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs flex items-center justify-center gap-2"
                    title="Reverse the posted expense and its journal entry"
                  >
                    {expenseBusy === 'reverse' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    <span>Reverse Expense (reverse journal entry)</span>
                  </button>
                )}

                {selectedExpense.status === 'REJECTED' && (
                  <button
                    onClick={() => handleCancelExpense(selectedExpense)}
                    disabled={expenseBusy !== null}
                    className="w-full py-2 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs flex items-center justify-center gap-2"
                    title="Cancel the rejected expense"
                  >
                    {expenseBusy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                    <span>Cancel Expense</span>
                  </button>
                )}

                {selectedExpense.status === 'CANCELLED' && (
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                    <Ban size={13} /> Cancelled — no actions available
                  </span>
                )}
                {selectedExpense.status === 'REVERSED' && (
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                    <RotateCcw size={13} /> Reversed — journal entry reversed
                  </span>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedExpenseId(null)}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-xs text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
