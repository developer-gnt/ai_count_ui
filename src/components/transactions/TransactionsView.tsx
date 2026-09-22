import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeftRight
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchAccounts } from '../../features/accounts/accountsSlice';
import {
  fetchJournalEntries,
  fetchJournalEntryById,
  createJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
} from '../../features/journalEntries/journalEntriesSlice';
import { formatINR, formatDate } from '../../utils/formatters';
import { Transaction, TransactionType, TransactionStatus } from '../../types';
import type { JournalEntry } from '../../api/journalEntriesTypes';

interface TransactionsViewProps {
  navigate: (route: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ navigate }) => {
  const { transactions, addTransaction, currentOrg } = useAccounting();
  const dispatch = useAppDispatch();
  const accountsState = useAppSelector((state) => state.accounts);
  const journalState = useAppSelector((state) => state.journalEntries);

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [journalBusyId, setJournalBusyId] = useState<string | null>(null);

  // Ledger accounts from GET /accounts feed the voucher "Bank / Cash Ledger"
  // dropdown. Real API data only — no fake accounts. Fetches wait for the
  // active organization (TenantAccessGuard rejects headerless requests) and
  // re-run when the tenant switches.
  const activeOrganizationId = useAppSelector(
    (state) => state.organizations.activeOrganizationId,
  );
  useEffect(() => {
    if (activeOrganizationId) {
      dispatch(fetchAccounts());
    }
  }, [activeOrganizationId, dispatch]);

  const accountOptions = accountsState.items
    .filter((a: any) => (a.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE')
    .map((a: any) => (a.code ? `${a.name} (${a.code})` : a.name) as string);

  // Real journal entries (GET /journal-entries) back the "Journal" tab.
  useEffect(() => {
    if (activeTab === 'Journal') {
      dispatch(fetchJournalEntries());
    }
  }, [activeTab, dispatch]);

  // New journal entry form state (POST /journal-entries via createJournalEntry)
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [journalNarration, setJournalNarration] = useState('');
  const [journalLine1Account, setJournalLine1Account] = useState('');
  const [journalLine1Debit, setJournalLine1Debit] = useState('');
  const [journalLine2Account, setJournalLine2Account] = useState('');
  const [journalLine2Credit, setJournalLine2Credit] = useState('');
  const [journalError, setJournalError] = useState('');
  const [journalSubmitting, setJournalSubmitting] = useState(false);

  const journalAccountOptions = accountsState.items.filter(
    (a: any) => (a.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE',
  );

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setJournalError('');

    const debitValue = parseFloat(journalLine1Debit) || 0;
    const creditValue = parseFloat(journalLine2Credit) || 0;

    if (!journalLine1Account || !journalLine2Account) {
      setJournalError('Select a ledger account for both the debit and the credit line.');
      return;
    }
    if (journalLine1Account === journalLine2Account) {
      setJournalError('The debit and credit lines must use different ledger accounts.');
      return;
    }
    if (debitValue <= 0 || Math.abs(debitValue - creditValue) > 0.001) {
      setJournalError('Debit and credit amounts must match and be greater than zero.');
      return;
    }

    setJournalSubmitting(true);
    try {
      await dispatch(
        createJournalEntry({
          entryDate: new Date(journalDate).toISOString(),
          description: journalNarration.trim(),
          lines: [
            {
              accountId: journalLine1Account,
              debitAmount: debitValue,
              creditAmount: 0,
            },
            {
              accountId: journalLine2Account,
              debitAmount: 0,
              creditAmount: creditValue,
            },
          ],
        }),
      ).unwrap();
      setIsJournalModalOpen(false);
      setJournalNarration('');
      setJournalLine1Account('');
      setJournalLine1Debit('');
      setJournalLine2Account('');
      setJournalLine2Credit('');
      dispatch(fetchJournalEntries());
    } catch (err) {
      setJournalError(err instanceof Error ? err.message : 'Failed to create journal entry.');
    } finally {
      setJournalSubmitting(false);
    }
  };

  const openJournalDetail = (entry: JournalEntry) => {
    setSelectedJournal(entry);
    // Re-fetch from the backend so the drawer shows server state.
    void dispatch(fetchJournalEntryById(entry.id));
  };

  const handlePostJournal = async (id: string) => {
    setJournalBusyId(id);
    try {
      await dispatch(postJournalEntry(id)).unwrap();
      dispatch(fetchJournalEntries());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to post journal entry.');
    } finally {
      setJournalBusyId(null);
    }
  };

  const handleReverseJournal = async (id: string) => {
    if (!window.confirm('Reverse this posted journal entry? A contra entry will be created.')) return;
    setJournalBusyId(id);
    try {
      await dispatch(reverseJournalEntry(id)).unwrap();
      dispatch(fetchJournalEntries());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to reverse journal entry.');
    } finally {
      setJournalBusyId(null);
    }
  };

  const [voucherType, setVoucherType] = useState<TransactionType>('Expense');
  const [voucherDate, setVoucherDate] = useState('2026-08-08');
  const [partyName, setPartyName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [account, setAccount] = useState('HDFC Current A/c (0060)');
  const [referenceNo, setReferenceNo] = useState('');

  const tabs = ['All', 'Sales', 'Purchases', 'Expenses', 'Payments', 'Receipts', 'Journal'];

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'Sales' && tx.type !== 'Sale') return false;
    if (activeTab === 'Purchases' && tx.type !== 'Purchase') return false;
    if (activeTab === 'Expenses' && tx.type !== 'Expense') return false;
    if (activeTab === 'Payments' && tx.type !== 'Payment') return false;
    if (activeTab === 'Receipts' && tx.type !== 'Receipt') return false;
    if (activeTab === 'Journal' && tx.type !== 'Journal') return false;

    if (statusFilter !== 'All' && tx.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.partyName || '').toLowerCase().includes(q) ||
        (tx.referenceNo || '').toLowerCase().includes(q) ||
        (tx.partyGstin || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount) || 0;
    const rate = parseFloat(gstRate) || 0;
    const taxable = (numAmount / (1 + rate / 100));
    const gstVal = numAmount - taxable;

    addTransaction({
      date: voucherDate,
      description,
      type: voucherType,
      partyName,
      partyType: voucherType === 'Sale' || voucherType === 'Receipt' ? 'Customer' : 'Vendor',
      amount: numAmount,
      taxableAmount: Math.round(taxable),
      gstAmount: Math.round(gstVal),
      gstRate: rate,
      status: 'Categorized',
      account,
      referenceNo: referenceNo || `REF-${Date.now().toString().slice(-6)}`,
    });

    setIsModalOpen(false);
    setDescription('');
    setPartyName('');
    setAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight">
            General Ledger & Transactions
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Complete audit-grade double-entry transaction record for {currentOrg?.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            id="record-voucher-btn"
            className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors"
          >
            <Plus size={14} />
            <span>Record Transaction Voucher</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xs p-4 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xs transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 relative max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party, description, voucher ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-xs bg-white text-slate-800 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Categorized">Categorized</option>
              <option value="Paid">Paid</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Reconciled">Reconciled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Journal Entries (backend GET /journal-entries) */}
      {activeTab === 'Journal' && (
        <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Double-Entry Journal Vouchers
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Draft entries from the ledger; post or reverse them below
              </p>
            </div>
            <button
              onClick={() => {
                setJournalError('');
                setIsJournalModalOpen(true);
              }}
              id="create-journal-entry-btn"
              className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus size={14} />
              <span>New Journal Entry</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left swiss-table border-collapse">
              <thead>
                <tr>
                  <th className="w-28">Entry No.</th>
                  <th className="w-28">Date</th>
                  <th>Description</th>
                  <th className="text-center w-24">Lines</th>
                  <th className="text-right w-32">Total Debit</th>
                  <th className="text-center w-24">Status</th>
                  <th className="text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {journalState.status === 'loading' && journalState.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-mono">
                      Loading journal entries from server…
                    </td>
                  </tr>
                )}
                {journalState.status !== 'loading' && journalState.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-mono">
                      No journal entries found for this organization.
                    </td>
                  </tr>
                )}
                {journalState.items
                  .filter((je) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (je.entryNumber || '').toLowerCase().includes(q) ||
                      (je.description || '').toLowerCase().includes(q)
                    );
                  })
                  .map((je) => (
                    <tr
                      key={je.id}
                      onClick={() => openJournalDetail(je)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-mono text-slate-600 text-xs">{je.entryNumber}</td>
                      <td className="font-mono text-slate-600 text-xs">{formatDate(je.entryDate)}</td>
                      <td className="font-medium text-slate-900 text-xs">
                        <div className="truncate max-w-xs">{je.description}</div>
                      </td>
                      <td className="text-center text-xs font-mono text-slate-600">{je.lines.length}</td>
                      <td className="text-right font-mono text-slate-900 text-xs">
                        {formatINR(je.lines.reduce((s, l) => s + (l.debitAmount ?? 0), 0))}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-semibold ${
                            je.status === 'POSTED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : je.status === 'REVERSED'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {je.status}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {je.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePostJournal(je.id)}
                            disabled={journalBusyId === je.id}
                            className="text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-50 mr-3"
                          >
                            {journalBusyId === je.id ? 'Posting…' : 'Post'}
                          </button>
                        )}
                        {je.status === 'POSTED' && (
                          <button
                            onClick={() => handleReverseJournal(je.id)}
                            disabled={journalBusyId === je.id}
                            className="text-[11px] font-semibold text-amber-700 hover:underline disabled:opacity-50 mr-3"
                          >
                            {journalBusyId === je.id ? 'Reversing…' : 'Reverse'}
                          </button>
                        )}
                        <button
                          onClick={() => openJournalDetail(je)}
                          className="text-[11px] font-semibold text-slate-900 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{journalState.items.length} journal entries</span>
            <button
              onClick={() => dispatch(fetchJournalEntries())}
              disabled={journalState.status === 'loading'}
              className="hover:text-slate-900 disabled:opacity-50"
            >
              {journalState.status === 'loading' ? 'Refreshing…' : 'Refresh from server'}
            </button>
          </div>
          {journalState.error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200 text-red-700 text-xs font-mono">
              Journal sync error: {journalState.error}{' '}
              <button onClick={() => dispatch(fetchJournalEntries())} className="underline font-semibold">
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Journal Entry Modal → POST /journal-entries via createJournalEntry() */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  New Journal Entry (Double Entry)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  One debit line and one credit line; amounts must balance
                </p>
              </div>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="p-6 space-y-4 text-xs">
              {journalError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xs">
                  {journalError}
                </div>
              )}
              {journalAccountOptions.length === 0 && (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xs">
                  No ledger accounts available. Add accounts first (Settings → Chart of Accounts is
                  coming from GET /accounts).
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Narration *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Office rent paid via NEFT"
                    value={journalNarration}
                    onChange={(e) => setJournalNarration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[11px] font-mono font-bold uppercase text-slate-600">
                  Debit Line
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Account *</label>
                    <select
                      required
                      value={journalLine1Account}
                      onChange={(e) => setJournalLine1Account(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white font-mono"
                    >
                      <option value="">-- Select ledger account --</option>
                      {journalAccountOptions.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.code ? `${a.name} (${a.code})` : a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Debit Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={journalLine1Debit}
                      onChange={(e) => setJournalLine1Debit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[11px] font-mono font-bold uppercase text-slate-600">
                  Credit Line
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Account *</label>
                    <select
                      required
                      value={journalLine2Account}
                      onChange={(e) => setJournalLine2Account(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white font-mono"
                    >
                      <option value="">-- Select ledger account --</option>
                      {journalAccountOptions.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.code ? `${a.name} (${a.code})` : a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Credit Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={journalLine2Credit}
                      onChange={(e) => setJournalLine2Credit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={journalSubmitting || journalAccountOptions.length < 2}
                  className="px-5 py-2 bg-slate-950 text-white hover:bg-slate-800 rounded-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {journalSubmitting ? 'Saving…' : 'Save Draft Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Transactions Table (mock/local ledger for unmigrated voucher types) */}
      {activeTab !== 'Journal' && (
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left swiss-table border-collapse">
            <thead>
              <tr>
                <th className="w-28">Date</th>
                <th>Description & Voucher Ref</th>
                <th className="w-24">Voucher Type</th>
                <th>Counterparty</th>
                <th>Account</th>
                <th className="text-right w-28">Amount</th>
                <th className="text-right w-24">GST Tax</th>
                <th className="text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-mono">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="font-medium text-slate-900 max-w-xs">
                      <div className="truncate">{tx.description}</div>
                      {tx.referenceNo && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ref: {tx.referenceNo}
                        </div>
                      )}
                      {tx.isAiFlagged && (
                        <div className="text-[10px] text-amber-700 font-mono flex items-center gap-1 mt-0.5">
                          <AlertCircle size={10} />
                          <span>AI Audit Review Pending</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold rounded-xs ${
                          tx.type === 'Sale' || tx.type === 'Receipt'
                            ? 'bg-emerald-50 text-emerald-800'
                            : tx.type === 'Expense'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="text-slate-700 text-xs">
                      <div>{tx.partyName}</div>
                      {tx.partyGstin && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          GSTIN: {tx.partyGstin}
                        </div>
                      )}
                    </td>
                    <td className="text-xs text-slate-600 font-mono truncate max-w-[150px]">
                      {tx.account}
                    </td>
                    <td className="text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="text-right font-mono text-slate-600 whitespace-nowrap text-xs">
                      {tx.gstAmount > 0 ? formatINR(tx.gstAmount) : '—'}
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-medium ${
                          tx.status === 'Paid' || tx.status === 'Reconciled'
                            ? 'bg-emerald-100 text-emerald-900'
                            : tx.status === 'Pending Review'
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : 'bg-slate-100 text-slate-700'
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

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Showing {filteredTransactions.length} of {transactions.length} total entries</span>
          <span>Click any entry to view double-entry journal posting</span>
        </div>
      </div>
      )}

      {/* Journal Entry Detail Modal (GET /journal-entries/{id}) */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                  Journal Entry • {selectedJournal.entryNumber}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {formatDate(selectedJournal.entryDate)} • {selectedJournal.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="text-slate-800">{selectedJournal.description}</div>
              <table className="w-full swiss-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJournal.lines.map((line) => {
                    const accountName =
                      accountsState.items.find((a: any) => a.id === line.accountId)?.name ??
                      line.accountId;
                    return (
                      <tr key={line.id}>
                        <td className="font-mono text-slate-700">{accountName}</td>
                        <td className="text-right font-mono">{line.debitAmount ? formatINR(line.debitAmount) : '—'}</td>
                        <td className="text-right font-mono">{line.creditAmount ? formatINR(line.creditAmount) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                {selectedJournal.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      void handlePostJournal(selectedJournal.id);
                      setSelectedJournal(null);
                    }}
                    disabled={journalBusyId === selectedJournal.id}
                    className="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xs font-semibold disabled:opacity-50"
                  >
                    Post Entry
                  </button>
                )}
                {selectedJournal.status === 'POSTED' && (
                  <button
                    onClick={() => {
                      void handleReverseJournal(selectedJournal.id);
                      setSelectedJournal(null);
                    }}
                    disabled={journalBusyId === selectedJournal.id}
                    className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xs font-semibold disabled:opacity-50"
                  >
                    Reverse Entry
                  </button>
                )}
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs font-medium hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Transaction Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Record Voucher / Transaction
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Standard double-entry voucher entry
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Voucher Type *
                  </label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white"
                  >
                    <option value="Expense">Expense Voucher</option>
                    <option value="Sale">Sales Voucher</option>
                    <option value="Purchase">Purchase Voucher</option>
                    <option value="Payment">Payment Voucher</option>
                    <option value="Receipt">Receipt Voucher</option>
                    <option value="Journal">Journal Voucher (Contra/Adjustment)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Posting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Counterparty / Party Ledger *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Stationers or XYZ Pvt Ltd"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Narration / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial stationery and office supplies invoice"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Total Amount (INR ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Applicable GST Rate
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white font-mono"
                  >
                    <option value="0">0% (Exempt/Nil)</option>
                    <option value="5">5% (CGST 2.5% + SGST 2.5%)</option>
                    <option value="12">12% (CGST 6% + SGST 6%)</option>
                    <option value="18">18% (CGST 9% + SGST 9%)</option>
                    <option value="28">28% (CGST 14% + SGST 14%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Bank / Cash Ledger
                  </label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white font-mono"
                  >
                    {accountOptions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Reference / Cheque / UTR No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-998234"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 text-white hover:bg-slate-800 rounded-xs font-semibold"
                >
                  Post Voucher to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Detail Slide-out Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xs"
            onClick={() => setSelectedTx(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                    Voucher Detail • {selectedTx.id}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Posted on {formatDate(selectedTx.date)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">
                    Total Amount
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-950 mt-1">
                    {formatINR(selectedTx.amount)}
                  </div>
                  <div className="mt-1 text-slate-600 text-xs">
                    {selectedTx.description}
                  </div>
                </div>

                {selectedTx.isAiFlagged && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xs text-amber-900">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-700" />
                      <span>AI Review Flag</span>
                    </div>
                    <p className="text-[11px] mt-1 font-sans">
                      {selectedTx.aiFlagReason}
                    </p>
                  </div>
                )}

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Voucher Type:</span>
                    <span className="font-bold text-slate-900">{selectedTx.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Party Name:</span>
                    <span className="text-slate-900 font-semibold">{selectedTx.partyName}</span>
                  </div>
                  {selectedTx.partyGstin && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-sans">GSTIN:</span>
                      <span className="text-slate-900">{selectedTx.partyGstin}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Taxable Amount:</span>
                    <span className="text-slate-900">{formatINR(selectedTx.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">GST Tax Rate:</span>
                    <span className="text-slate-900">
                      {selectedTx.gstRate}% ({formatINR(selectedTx.gstAmount)})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Payment Account:</span>
                    <span className="text-slate-900">{selectedTx.account}</span>
                  </div>
                  {selectedTx.referenceNo && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-sans">Reference Voucher:</span>
                      <span className="text-slate-900">{selectedTx.referenceNo}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-[11px] font-bold uppercase font-mono text-slate-500 mb-2">
                    Double-Entry Journal Posting
                  </div>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-xs font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span>Dr. {selectedTx.partyName}</span>
                      <span>{formatINR(selectedTx.amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 pl-4">
                      <span>Cr. {selectedTx.account}</span>
                      <span>{formatINR(selectedTx.amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xs"
                >
                  Close Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
