import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  ScanLine,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
  Trash2,
  Banknote,
  Ban,
  RefreshCw,
  Loader2,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchVendorPayments,
  fetchVendorPaymentById,
  createVendorPayment,
  postVendorPayment,
  voidVendorPayment,
} from '../../features/vendorPayments/vendorPaymentsSlice';
import {
  fetchBills,
  fetchBillById,
  createBill,
  updateBill,
  deleteBill,
  finalizeBill,
  cancelBill,
} from '../../features/purchases/purchasesSlice';
import { fetchAccounts } from '../../features/accounts/accountsSlice';
import { VendorPaymentStatus } from '../../api/vendorPaymentsTypes';
import type { VendorPayment } from '../../api/vendorPaymentsTypes';
import type { PurchaseBill } from '../../api/purchasesTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { formatINR, formatDate } from '../../utils/formatters';

interface PurchasesViewProps {
  navigate: (route: string) => void;
}

const BILL_STATUS_TABS = ['All', 'DRAFT', 'FINALIZED', 'CANCELLED', 'PAID', 'PARTIALLY_PAID'];

export const PurchasesView: React.FC<PurchasesViewProps> = ({ navigate }) => {
  // Vendors still come from AccountingContext (which maps the vendors Redux
  // slice onto the legacy UI shape); they are real backend data, not mock.
  const { vendors } = useAccounting();
  const dispatch = useAppDispatch();
  const vpState = useAppSelector((state) => state.vendorPayments);
  const accountsState = useAppSelector((state) => state.accounts);
  const billsState = useAppSelector((state) => state.purchases);
  const activeOrganizationId = useAppSelector(
    (state) => state.organizations.activeOrganizationId,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // PURCHASE BILLS — real backend module (GET/POST/PATCH/DELETE
  // /api/v1/bills + finalize/cancel). The list loads on mount / tenant
  // switch / refresh; every mutation goes through the purchasesSlice
  // thunks via dispatch().
  // ────────────────────────────────────────────────────────────────
  const [billRefresh, setBillRefresh] = useState(0);
  const [billError, setBillError] = useState('');
  const [billSuccess, setBillSuccess] = useState('');
  const [billBusy, setBillBusy] = useState<string | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  // ────────────────────────────────────────────────────────────────
  // VENDOR PAYMENTS — real backend module (GET/POST /vendor-payments).
  // ────────────────────────────────────────────────────────────────
  const [vpRefresh, setVpRefresh] = useState(0);
  const [vpError, setVpError] = useState('');
  const [vpSuccess, setVpSuccess] = useState('');
  const [vpBusy, setVpBusy] = useState<string | null>(null);

  // Pay-vendor modal state (POST /vendor-payments)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payVendorId, setPayVendorId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState('');

  // Detail modal state (GET /vendor-payments/{id} + post/void actions)
  const [selectedVpId, setSelectedVpId] = useState<string | null>(null);
  const [postAccountId, setPostAccountId] = useState('');

  useEffect(() => {
    if (activeOrganizationId) {
      dispatch(fetchBills());
    }
  }, [activeOrganizationId, billRefresh, dispatch]);

  useEffect(() => {
    if (activeOrganizationId) {
      dispatch(fetchVendorPayments());
    }
  }, [activeOrganizationId, vpRefresh, dispatch]);

  // "View bill" → GET /bills/:id to refresh status/items; the fulfilled case
  // upserts into the list so the drawer re-renders with fresh data.
  useEffect(() => {
    if (selectedBillId) {
      dispatch(fetchBillById(selectedBillId));
    }
  }, [selectedBillId, dispatch]);

  // Accounts feed the "pay from" picker in the post action; fetched once.
  useEffect(() => {
    if (activeOrganizationId && accountsState.status === 'idle') {
      dispatch(fetchAccounts());
    }
  }, [activeOrganizationId, accountsState.status, dispatch]);

  const vendorNameById = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [vendors]);

  const vendorLabel = (b: PurchaseBill) =>
    b.vendorNameSnapshot || b.vendor?.name || vendorNameById.get(b.vendorId) || '—';
  const vendorGstinLabel = (b: PurchaseBill) =>
    b.vendorGstinSnapshot || b.vendor?.gstin || '';

  const selectedVp: VendorPayment | null = selectedVpId
    ? vpState.items.find((p) => p.id === selectedVpId) ?? null
    : null;

  const selectedBill: PurchaseBill | null = selectedBillId
    ? billsState.items.find((b) => b.id === selectedBillId) ?? null
    : null;

  const openPayModal = () => {
    setPayVendorId(vendors[0]?.id || '');
    setPayAmount('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayRef('');
    setVpError('');
    setShowPayModal(true);
  };

  const submitVendorPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setVpError('Enter a payment amount greater than zero.');
      return;
    }
    setVpBusy('create');
    setVpError('');
    try {
      const created = await dispatch(
        createVendorPayment({
          vendorId: payVendorId || undefined,
          amount,
          paymentDate: payDate,
          referenceNumber: payRef.trim() ? payRef.trim() : undefined,
        }),
      ).unwrap();
      setShowPayModal(false);
      setVpSuccess(`Payment ${created.paymentNumber} saved as DRAFT.`);
    } catch (err) {
      setVpError(getApiErrorMessage(err, 'Failed to create the vendor payment.'));
    } finally {
      setVpBusy(null);
    }
  };

  const openVpDetail = (id: string) => {
    setSelectedVpId(id);
    setVpError('');
    setVpSuccess('');
    // Refresh the record from GET /vendor-payments/{id}
    dispatch(fetchVendorPaymentById(id));
  };

  const handlePostVp = async (vp: VendorPayment) => {
    if (!postAccountId) {
      setVpError('Select the bank/cash account to pay from before posting.');
      return;
    }
    setVpBusy('post');
    setVpError('');
    try {
      const posted = await dispatch(
        postVendorPayment({ id: vp.id, paymentAccountId: postAccountId }),
      ).unwrap();
      setVpSuccess(`Payment ${posted.paymentNumber} posted to the ledger.`);
    } catch (err) {
      setVpError(getApiErrorMessage(err, 'Failed to post the vendor payment.'));
    } finally {
      setVpBusy(null);
    }
  };

  const handleVoidVp = async (vp: VendorPayment) => {
    if (!window.confirm(`Void payment ${vp.paymentNumber}? Its journal entry will be reversed.`)) return;
    setVpBusy('void');
    setVpError('');
    try {
      await dispatch(voidVendorPayment(vp.id)).unwrap();
      setVpSuccess(`Payment ${vp.paymentNumber} voided (journal entry reversed).`);
    } catch (err) {
      setVpError(getApiErrorMessage(err, 'Failed to void the vendor payment.'));
    } finally {
      setVpBusy(null);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // PURCHASE BILLS — lifecycle actions (backend status rules).
  // Only DRAFT bills can be updated/finalized/deleted; only FINALIZED
  // bills can be cancelled (and not PAID/PARTIALLY_PAID).
  // ────────────────────────────────────────────────────────────────
  const runBillAction = async (label: string, action: () => Promise<unknown>, onDone?: () => void) => {
    setBillBusy(label);
    setBillError('');
    try {
      await action();
      onDone?.();
    } catch (err) {
      setBillError(getApiErrorMessage(err, `Failed to ${label.toLowerCase()} the purchase bill.`));
    } finally {
      setBillBusy(null);
    }
  };

  const handleFinalizeBill = (bill: PurchaseBill) =>
    runBillAction('Finalize', () => dispatch(finalizeBill(bill.id)).unwrap());

  const handleCancelBill = (bill: PurchaseBill) => {
    if (!window.confirm(`Cancel purchase bill ${bill.billNumber}? Its posted journal entry will be reversed.`)) return;
    void runBillAction('Cancel', () => dispatch(cancelBill(bill.id)).unwrap());
  };

  const handleDeleteDraft = (bill: PurchaseBill) => {
    if (!window.confirm(`Delete draft ${bill.billNumber}? This cannot be undone.`)) return;
    void runBillAction('Delete', async () => {
      await dispatch(deleteBill(bill.id)).unwrap();
      setSelectedBillId(null);
    });
  };

  const handleEditNotes = (bill: PurchaseBill) => {
    const input = window.prompt('Update draft notes', bill.notes || '');
    if (input === null) return;
    void runBillAction('Update', () =>
      dispatch(updateBill({ id: bill.id, payload: { notes: input || undefined } })).unwrap(),
    );
  };

  // New Purchase Bill form
  const [billNumber, setBillNumber] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [taxableAmount, setTaxableAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [itcEligible, setItcEligible] = useState(true);

  const openBillModal = () => {
    if (!selectedVendorId && vendors.length > 0) {
      setSelectedVendorId(vendors[0].id);
    }
    setBillError('');
    setBillSuccess('');
    setIsRecordModalOpen(true);
  };

  // Simulated OCR autofill demo
  const handleSimulateOcr = () => {
    setIsOcrScanning(true);
    setTimeout(() => {
      setIsOcrScanning(false);
      setBillNumber('OCR-INV-7712');
      if (vendors.length > 1) {
        setSelectedVendorId(vendors[1].id);
      }
      setTaxableAmount('84500');
      setGstRate('18');
      setDate('2026-08-06');
      setDueDate('2026-09-05');
      setItcEligible(true);
    }, 900);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billBusy) return;
    if (!selectedVendorId) {
      setBillError('Select a supplier / vendor before saving the bill.');
      return;
    }
    const taxable = parseFloat(taxableAmount);
    if (!taxable || taxable <= 0) {
      setBillError('Enter a taxable material cost greater than zero.');
      return;
    }
    const rate = parseFloat(gstRate) || 0;

    setBillBusy('create');
    setBillError('');
    try {
      await dispatch(
        createBill({
          vendorId: selectedVendorId,
          vendorInvoiceNumber: billNumber.trim() ? billNumber.trim() : undefined,
          billDate: date,
          dueDate: dueDate || undefined,
          itcEligible,
          items: [
            {
              description: 'Industrial Inward Material Purchase',
              hsn: '7208',
              quantity: 1,
              unitPrice: taxable,
              taxRate: rate,
              itcEligible,
            },
          ],
        }),
      ).unwrap();
      setIsRecordModalOpen(false);
      setBillSuccess('Purchase bill saved as DRAFT.');
      setBillNumber('');
      setTaxableAmount('');
    } catch (err) {
      setBillError(getApiErrorMessage(err, 'Failed to create the purchase bill.'));
    } finally {
      setBillBusy(null);
    }
  };

  const totalPurchases = billsState.items.reduce((sum, b) => sum + Number(b.grandTotal), 0);
  const totalItc = billsState.items.reduce((sum, b) => sum + Number(b.itcClaimedAmount), 0);
  const openPayables = billsState.items
    .filter((b) => b.status === 'FINALIZED')
    .reduce((sum, b) => sum + Number(b.grandTotal), 0);

  const filteredBills = billsState.items.filter((b) => {
    if (statusFilter !== 'All' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.billNumber.toLowerCase().includes(q) ||
        (b.vendorInvoiceNumber || '').toLowerCase().includes(q) ||
        vendorLabel(b).toLowerCase().includes(q) ||
        vendorGstinLabel(b).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const billStatusBadgeClass = (status: PurchaseBill['status']) => {
    switch (status) {
      case 'FINALIZED':
      case 'PAID':
        return 'bg-emerald-100 text-emerald-900';
      case 'PARTIALLY_PAID':
        return 'bg-amber-100 text-amber-900';
      case 'CANCELLED':
        return 'bg-red-100 text-red-900';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight">
            Purchases & Vendor Inwarding
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Vendor tax invoices, GSTR-2B Input Tax Credit (ITC) reconciliation & Payables
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* TODO:
          OCR / Document Ingestion is temporarily disabled.
          Preserve all implementation for future reactivation.
          <button
            onClick={() => {
              openBillModal();
              handleSimulateOcr();
            }}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold px-3.5 py-2 rounded-xs flex items-center gap-1.5 transition-colors"
          >
            <ScanLine size={14} className="text-slate-700" />
            <span>Bill Ingestion (OCR)</span>
          </button>
          */}
          <button
            onClick={openPayModal}
            id="record-vendor-payment-btn"
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors"
          >
            <Banknote size={14} />
            <span>Pay Vendor</span>
          </button>
          <button
            onClick={openBillModal}
            id="record-vendor-bill-btn"
            className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors"
          >
            <Plus size={14} />
            <span>Record Vendor Bill</span>
          </button>
        </div>
      </div>

      {/* ───── VENDOR PAYMENTS (real backend module) ───── */}
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="border-b border-slate-200 p-4 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Banknote size={15} className="text-emerald-700" />
              Vendor Payments — Outgoing Cash Disbursements
            </h3>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              GET /vendor-payments • drafts → post (books journal) → void (reverses journal)
            </p>
          </div>
          <button
            onClick={() => setVpRefresh((t) => t + 1)}
            disabled={vpState.status === 'loading'}
            className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={vpState.status === 'loading' ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {vpError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><AlertCircle size={13} />{vpError}</span>
              <button onClick={() => setVpError('')} className="p-0.5 hover:text-red-950" title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}
          {vpSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><CheckCircle2 size={13} />{vpSuccess}</span>
              <button onClick={() => setVpSuccess('')} className="p-0.5 hover:text-emerald-950" title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left swiss-table border-collapse">
              <thead>
                <tr>
                  <th className="w-36">Payment No</th>
                  <th>Vendor</th>
                  <th className="w-28">Date</th>
                  <th className="w-32">Reference</th>
                  <th className="text-right w-32">Amount</th>
                  <th className="text-center w-28">Status</th>
                  <th className="text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vpState.status === 'loading' && vpState.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading vendor payments...
                    </td>
                  </tr>
                ) : vpState.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-mono">
                      No vendor payments yet. Use “Pay Vendor” to create one.
                    </td>
                  </tr>
                ) : (
                  vpState.items.map((vp) => (
                    <tr
                      key={vp.id}
                      onClick={() => openVpDetail(vp.id)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-mono font-bold text-slate-900 whitespace-nowrap">{vp.paymentNumber}</td>
                      <td className="text-xs font-semibold text-slate-900">
                        {(vp.vendorId && vendorNameById.get(vp.vendorId)) || 'Unassigned'}
                      </td>
                      <td className="font-mono text-slate-600 whitespace-nowrap text-xs">{formatDate(vp.paymentDate)}</td>
                      <td className="font-mono text-slate-600 whitespace-nowrap text-xs">{vp.referenceNumber || '—'}</td>
                      <td className="text-right font-mono font-bold text-slate-950 whitespace-nowrap">{formatINR(Number(vp.amount))}</td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-semibold ${
                            vp.status === VendorPaymentStatus.POSTED
                              ? 'bg-emerald-100 text-emerald-900'
                              : vp.status === VendorPaymentStatus.VOIDED
                              ? 'bg-red-100 text-red-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {vp.status}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openVpDetail(vp.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xs"
                          title="View payment (GET /vendor-payments/{id})"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Purchases (FY)
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(totalPurchases, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            {billsState.items.length} inward bills registered
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Claimable ITC (Tax Credit)
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1.5">
            {formatINR(totalItc, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-emerald-700 font-semibold">
            Eligible under Sec 16(2)
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Payables to Settle
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(openPayables, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-600">
            Credit period active
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            GSTR-2B Matching
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1.5">
            100% Matched
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            No 2B discrepancy detected
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-xs p-4 space-y-4">
        <div className="flex items-center gap-1 border-b border-slate-200 pb-3 overflow-x-auto">
          {BILL_STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xs transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 relative max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by bill number, vendor, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredBills.length} purchase vouchers
            </div>
            <button
              onClick={() => setBillRefresh((t) => t + 1)}
              disabled={billsState.status === 'loading'}
              className="bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xs flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={billsState.status === 'loading' ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="p-4 space-y-3">
          {billsState.error && billsState.items.length === 0 && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle size={13} />
                {getApiErrorMessage({ message: billsState.error }, 'Failed to load purchase bills.')}
              </span>
              <button
                onClick={() => setBillRefresh((t) => t + 1)}
                className="px-2 py-0.5 border border-red-300 rounded-xs text-red-900 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}
          {billError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><AlertCircle size={13} />{billError}</span>
              <button onClick={() => setBillError('')} className="p-0.5 hover:text-red-950" title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}
          {billSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><CheckCircle2 size={13} />{billSuccess}</span>
              <button onClick={() => setBillSuccess('')} className="p-0.5 hover:text-emerald-950" title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left swiss-table border-collapse">
              <thead>
                <tr>
                  <th className="w-28">Bill No</th>
                  <th>Vendor & GSTIN</th>
                  <th className="w-24">Bill Date</th>
                  <th className="w-24">Due Date</th>
                  <th className="text-right w-28">Taxable Amt</th>
                  <th className="text-right w-24">GST Tax</th>
                  <th className="text-right w-32">Total Bill</th>
                  <th className="text-center w-28">ITC Status</th>
                  <th className="text-center w-24">Status</th>
                  <th className="text-right w-16"></th>
                </tr>
              </thead>
              <tbody>
                {billsState.status === 'loading' && billsState.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading purchase bills...
                    </td>
                  </tr>
                ) : billsState.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 text-xs font-mono">
                      No purchase bills yet. Use “Record Vendor Bill” to create one.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => {
                        setSelectedBillId(b.id);
                        setBillError('');
                        setBillSuccess('');
                      }}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="font-mono font-bold text-slate-900 whitespace-nowrap">
                        {b.billNumber}
                      </td>
                      <td className="text-xs">
                        <div className="font-semibold text-slate-900">{vendorLabel(b)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          GSTIN: {vendorGstinLabel(b) || '—'}
                        </div>
                      </td>
                      <td className="font-mono text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(b.billDate)}
                      </td>
                      <td className="font-mono text-slate-600 whitespace-nowrap text-xs">
                        {b.dueDate ? formatDate(b.dueDate) : '—'}
                      </td>
                      <td className="text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatINR(Number(b.taxableAmount))}
                      </td>
                      <td className="text-right font-mono text-slate-600 whitespace-nowrap text-xs">
                        {formatINR(Number(b.cgstAmount) + Number(b.sgstAmount) + Number(b.igstAmount))}
                      </td>
                      <td className="text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                        {formatINR(Number(b.grandTotal))}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded-xs font-semibold ${
                            b.itcEligible
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {b.itcEligible ? 'ITC Eligible' : 'Ineligible'}
                        </span>
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-semibold ${billStatusBadgeClass(b.status)}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBillId(b.id);
                            setBillError('');
                            setBillSuccess('');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-900"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PAY VENDOR MODAL (POST /vendor-payments via dispatch) */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">Pay Vendor</h3>
                <p className="text-xs text-slate-500 font-mono">Creates a DRAFT vendor payment</p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Vendor</label>
                  <select
                    value={payVendorId}
                    onChange={(e) => setPayVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs bg-white font-medium focus:outline-none focus:border-slate-900"
                  >
                    <option value="">— Unassigned —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reference No.</label>
                  <input
                    type="text"
                    placeholder="UTR / cheque no."
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
              {vpError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center gap-2">
                  <AlertCircle size={13} />{vpError}
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200 rounded-xs p-2.5">
                The draft must then be <strong>posted</strong> from the payments table (choose the
                bank/cash account) — posting books the journal entry.
              </p>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={vpBusy !== null}
                  onClick={submitVendorPayment}
                  className="px-5 py-2 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 rounded-xs font-semibold flex items-center gap-2"
                >
                  {vpBusy === 'create' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Draft Payment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR PAYMENT DETAIL MODAL (GET by id + post/void) */}
      {selectedVp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight font-mono">
                  Vendor Payment • {selectedVp.paymentNumber}
                </h3>
                <p className="text-xs text-slate-500 font-mono">Status: {selectedVp.status}</p>
              </div>
              <button
                onClick={() => setSelectedVpId(null)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs">
                <div className="text-[11px] text-slate-400 uppercase font-mono">Amount</div>
                <div className="text-2xl font-bold font-mono text-slate-950 mt-1">
                  {formatINR(Number(selectedVp.amount))}
                </div>
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-sans">Vendor:</span>
                  <span className="font-semibold text-slate-900">
                    {(selectedVp.vendorId && vendorNameById.get(selectedVp.vendorId)) || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-sans">Payment Date:</span>
                  <span className="text-slate-900">{formatDate(selectedVp.paymentDate)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-sans">Reference:</span>
                  <span className="text-slate-900">{selectedVp.referenceNumber || '—'}</span>
                </div>
                {selectedVp.journalEntryId && (
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Journal Entry:</span>
                    <span className="text-slate-900 font-mono text-[10px] max-w-[180px] truncate">
                      {selectedVp.journalEntryId}
                    </span>
                  </div>
                )}
              </div>

              {selectedVp.status === VendorPaymentStatus.DRAFT && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="block font-medium text-slate-700">
                    Pay from Bank / Cash Account *
                  </label>
                  <select
                    value={postAccountId}
                    onChange={(e) => setPostAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs bg-white font-medium focus:outline-none focus:border-slate-900"
                  >
                    <option value="">— select account —</option>
                    {accountsState.items.map((a) => (
                      <option key={a.id} value={a.id}>
                        {(a as { code?: string }).code ? `${(a as { code?: string }).code} — ` : ''}
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={vpBusy !== null || !postAccountId}
                    onClick={() => handlePostVp(selectedVp)}
                    className="w-full py-2 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 text-xs font-semibold rounded-xs flex items-center justify-center gap-2"
                  >
                    {vpBusy === 'post' ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Post Payment to Ledger</span>
                    )}
                  </button>
                </div>
              )}

              {selectedVp.status === VendorPaymentStatus.POSTED && (
                <button
                  type="button"
                  disabled={vpBusy !== null}
                  onClick={() => handleVoidVp(selectedVp)}
                  className="w-full py-2 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs flex items-center justify-center gap-2"
                >
                  {vpBusy === 'void' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Voiding...</span>
                    </>
                  ) : (
                    <>
                      <Ban size={13} />
                      <span>Void Payment (reverse journal entry)</span>
                    </>
                  )}
                </button>
              )}

              {vpError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center gap-2">
                  <AlertCircle size={13} />{vpError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Purchase Bill Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Inward Vendor Bill & Purchase Voucher
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Record purchase invoice to claim Input Tax Credit (ITC)
                </p>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* OCR Progress Banner if running */}
            {isOcrScanning && (
              <div className="p-3 bg-slate-100 border-b border-slate-200 text-slate-900 text-xs flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Reading vendor invoice data & HSN classification...</span>
              </div>
            )}

            <form onSubmit={handleCreateBill} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Vendor Bill / Ref No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Select Supplier / Vendor *
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 bg-white"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gstin})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Bill Date *
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
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Taxable Material Cost (INR ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={taxableAmount}
                    onChange={(e) => setTaxableAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Applicable GST Rate *
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900 bg-white"
                  >
                    <option value="0">0% (Nil Rated)</option>
                    <option value="5">5% (CGST 2.5% + SGST 2.5%)</option>
                    <option value="12">12% (CGST 6% + SGST 6%)</option>
                    <option value="18">18% (CGST 9% + SGST 9%)</option>
                    <option value="28">28% (CGST 14% + SGST 14%)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xs">
                <input
                  type="checkbox"
                  id="itc-check"
                  checked={itcEligible}
                  onChange={(e) => setItcEligible(e.target.checked)}
                  className="rounded-xs text-slate-900 focus:ring-0"
                />
                <label htmlFor="itc-check" className="font-mono text-slate-800 cursor-pointer">
                  Eligible for GSTR-3B Input Tax Credit (ITC) claim
                </label>
              </div>

              {billError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center gap-2">
                  <AlertCircle size={13} />{billError}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={billBusy !== null}
                  className="px-5 py-2 bg-slate-950 disabled:opacity-50 text-white hover:bg-slate-800 rounded-xs font-semibold flex items-center gap-2"
                >
                  {billBusy === 'create' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <span>Inward Bill to Ledger</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill View Drawer */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xs"
            onClick={() => setSelectedBillId(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 xs:pl-6 sm:pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                    Purchase Bill • {selectedBill.billNumber}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Inwarded on {formatDate(selectedBill.billDate)} • {selectedBill.status}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBillId(null)}
                  className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">
                    Total Inward Bill Value
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-950 mt-1">
                    {formatINR(Number(selectedBill.grandTotal))}
                  </div>
                  <div className="mt-1 text-slate-600 text-xs font-semibold">
                    {vendorLabel(selectedBill)}
                  </div>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Vendor GSTIN:</span>
                    <span className="font-bold text-slate-900">{vendorGstinLabel(selectedBill) || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Taxable Base:</span>
                    <span className="text-slate-900">{formatINR(Number(selectedBill.taxableAmount))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">CGST + SGST:</span>
                    <span className="text-slate-900">{formatINR(Number(selectedBill.cgstAmount) + Number(selectedBill.sgstAmount))}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">Payment Due Date:</span>
                    <span className="text-slate-900">{selectedBill.dueDate ? formatDate(selectedBill.dueDate) : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-sans">ITC Eligibility:</span>
                    <span className="font-bold text-emerald-700">
                      {selectedBill.itcEligible ? 'Eligible for Tax Credit' : 'Ineligible'}
                    </span>
                  </div>
                </div>

                {/* Journal entry representation */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-[11px] font-bold uppercase font-mono text-slate-500 mb-2">
                    Ledger Journal Entry
                  </div>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-xs font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span>Dr. Purchase Account</span>
                      <span>{formatINR(Number(selectedBill.taxableAmount))}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Dr. Input Tax Credit (ITC) CGST/SGST</span>
                      <span>{formatINR(Number(selectedBill.itcClaimedAmount))}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 pl-4 border-t border-slate-800 pt-1">
                      <span>Cr. {vendorLabel(selectedBill)} Ledger</span>
                      <span>{formatINR(Number(selectedBill.grandTotal))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                {billError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><AlertCircle size={13} />{billError}</span>
                    <button onClick={() => setBillError('')} className="p-0.5 hover:text-red-950" title="Dismiss">
                      <X size={13} />
                    </button>
                  </div>
                )}
                {billSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><CheckCircle2 size={13} />{billSuccess}</span>
                    <button onClick={() => setBillSuccess('')} className="p-0.5 hover:text-emerald-950" title="Dismiss">
                      <X size={13} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedBill.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleFinalizeBill(selectedBill)}
                          disabled={billBusy !== null}
                          className="px-3 py-1.5 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                          title="Finalize the bill: generates the bill number and posts the double-entry journal"
                        >
                          {billBusy === 'Finalize' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                          <span>Finalize Bill</span>
                        </button>
                        <button
                          onClick={() => handleEditNotes(selectedBill)}
                          disabled={billBusy !== null}
                          className="px-3 py-1.5 bg-white disabled:opacity-50 border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-medium rounded-xs font-mono flex items-center gap-1.5"
                          title="PATCH /bills/:id — draft notes"
                        >
                          {billBusy === 'Update' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                          <span>Edit Notes</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(selectedBill)}
                          disabled={billBusy !== null}
                          className="px-3 py-1.5 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                          title="DELETE /bills/:id — only DRAFT bills can be deleted"
                        >
                          {billBusy === 'Delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          <span>Delete Draft</span>
                        </button>
                      </>
                    )}
                    {selectedBill.status === 'FINALIZED' && (
                      <button
                        onClick={() => handleCancelBill(selectedBill)}
                        disabled={billBusy !== null}
                        className="px-3 py-1.5 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                        title="Cancels the bill and reverses its posted journal entry"
                      >
                        {billBusy === 'Cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                        <span>Cancel Bill</span>
                      </button>
                    )}
                    {selectedBill.status === 'CANCELLED' && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                        <Ban size={13} /> Cancelled — journal entry reversed
                      </span>
                    )}
                    {(selectedBill.status === 'PAID' || selectedBill.status === 'PARTIALLY_PAID') && (
                      <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Settled — no actions available
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedBillId(null)}
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
