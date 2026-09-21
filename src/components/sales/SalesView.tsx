import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Printer,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Ban,
  ShieldCheck,
  FileText,
  Wallet,
  Loader2
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchInvoices,
  fetchInvoiceById,
  finalizeInvoice,
  cancelInvoice,
  deleteInvoice,
  updateInvoice,
} from '../../features/invoices/invoicesSlice';
import { toUiInvoice } from '../../features/invoices/invoiceMappers';
import type { ApiInvoiceStatus, Invoice as ApiInvoice } from '../../api/invoicesTypes';
import {
  createPayment,
  postPayment,
  voidPayment,
} from '../../features/payments/paymentsSlice';
import { PaymentMethod, PaymentStatus } from '../../api/paymentsTypes';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { useAccounting } from '../../context/AccountingContext';
import { formatINR, formatDate, numberToWordsIndian } from '../../utils/formatters';
import { Invoice } from '../../types';
import { InvoiceRenderer } from '../invoices/templates/InvoiceRenderer';
import { InvoiceTemplateId, InvoiceFormData } from '../invoices/types';
import { INVOICE_TEMPLATES, recalculateInvoice } from '../invoices/mockInvoiceData';

interface SalesViewProps {
  navigate: (route: string) => void;
}

// Backend lifecycle statuses mapped onto the UI filter tabs. The backend has
// no OVERDUE status, so the Overdue tab is derived from the due date.
const STATUS_TAB_TO_API: Record<string, ApiInvoiceStatus[]> = {
  All: [],
  Sent: ['FINALIZED'],
  Paid: ['PAID'],
  'Partially Paid': ['PARTIALLY_PAID'],
  Overdue: [],
  Draft: ['DRAFT', 'CANCELLED'],
};

const isOverdue = (inv: Invoice) =>
  Boolean(inv.dueDate) &&
  inv.dueDate < new Date().toISOString().slice(0, 10) &&
  (inv.apiStatus === 'FINALIZED' || inv.apiStatus === 'PARTIALLY_PAID');

export const SalesView: React.FC<SalesViewProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const { customers, currentOrg, currentUser } = useAccounting();
  const invoicesState = useAppSelector((state) => state.invoices);
  const paymentsState = useAppSelector((state) => state.payments);

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [drawerTemplateId, setDrawerTemplateId] = useState<InvoiceTemplateId>('classic');
  const [actionError, setActionError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState('');

  // Record-payment modal state (POST payments route + optional post)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [payRef, setPayRef] = useState('');

  // Invoices live in the backend via the invoices Redux slice (GET /invoices).
  // Map them onto the legacy UI shape for the table/printer consumers.
  const invoices = useMemo<Invoice[]>(
    () => invoicesState.items.map(toUiInvoice),
    [invoicesState.items],
  );

  // Load the invoice list when the view mounts.
  useEffect(() => {
    dispatch(fetchInvoices());
  }, [dispatch]);

  // "View invoice" â†’ GET /invoices/:id (the only endpoint that returns line
  // items; the list endpoint omits them). The fulfilled case upserts into the
  // list, which re-renders the drawer with fresh items/status.
  useEffect(() => {
    if (selectedInvoiceId) {
      dispatch(fetchInvoiceById(selectedInvoiceId));
    }
  }, [selectedInvoiceId, dispatch]);

  const selectedInvoice: Invoice | null = selectedInvoiceId
    ? invoices.find((i) => i.id === selectedInvoiceId) ?? null
    : null;

  const runInvoiceAction = async (label: string, action: () => Promise<unknown>, onDone?: () => void) => {
    setBusyAction(label);
    setActionError('');
    try {
      await action();
      onDone?.();
    } catch (err) {
      setActionError(getApiErrorMessage(err, `Failed to ${label.toLowerCase()} the invoice.`));
    } finally {
      setBusyAction(null);
    }
  };

  const handleFinalize = (inv: Invoice) =>
    runInvoiceAction('Finalize', () => dispatch(finalizeInvoice(inv.id)).unwrap());

  const handleCancel = (inv: Invoice) => {
    if (!window.confirm(`Cancel invoice ${inv.invoiceNumber}? The posted journal entry will be reversed.`)) return;
    void runInvoiceAction('Cancel', () => dispatch(cancelInvoice(inv.id)).unwrap());
  };

  const handleDeleteDraft = (inv: Invoice) => {
    if (!window.confirm(`Delete draft ${inv.invoiceNumber}? This cannot be undone.`)) return;
    void runInvoiceAction('Delete', async () => {
      await dispatch(deleteInvoice(inv.id)).unwrap();
      setSelectedInvoiceId(null);
    });
  };

  // PAYMENTS â€” create (POST /payments) and immediately post (POST /payments/{id}/post)
  // so the receivable settles and the invoice status updates server-side.
  const openPaymentModal = (inv: Invoice) => {
    setPayAmount(String(inv.totalAmount));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod(PaymentMethod.BANK_TRANSFER);
    setPayRef('');
    setPaySuccess('');
    setShowPaymentModal(true);
  };

  const submitPayment = async (inv: Invoice, alsoPost: boolean) => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setActionError('Enter a payment amount greater than zero.');
      return;
    }
    setBusyAction('Pay');
    setActionError('');
    try {
      const created = await dispatch(
        createPayment({
          customerId: inv.customerId,
          paymentDate: payDate,
          paymentMethod: payMethod,
          amount,
          referenceNumber: payRef.trim() ? payRef.trim() : undefined,
          allocations: [{ invoiceId: inv.id, amount }],
        }),
      ).unwrap();

      if (alsoPost) {
        await dispatch(postPayment(created.id)).unwrap();
        // Payment posted â†’ invoice status changed server-side (PAID /
        // PARTIALLY_PAID); refresh it so the list reflects the ledger.
        dispatch(fetchInvoiceById(inv.id));
        setPaySuccess(`Payment ${created.paymentNumber} posted.`);
      } else {
        setPaySuccess(`Payment ${created.paymentNumber} saved as draft.`);
      }
      setShowPaymentModal(false);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to record the payment.'));
    } finally {
      setBusyAction(null);
    }
  };

  // VOID â€” only POSTED payments can be voided (backend rule). The invoice's
  // status is recalculated server-side (back to FINALIZED/PARTIALLY_PAID), so
  // refresh it from the ledger afterwards.
  const handleVoidPayment = (inv: Invoice, paymentId: string, paymentNumber: string) => {
    if (!window.confirm(`Void payment ${paymentNumber}? Its journal entry will be reversed.`)) return;
    void runInvoiceAction('Void', async () => {
      await dispatch(voidPayment(paymentId)).unwrap();
      dispatch(fetchInvoiceById(inv.id));
      setPaySuccess(`Payment ${paymentNumber} voided. Invoice status refreshed.`);
    });
  };

  // Metrics â€” computed from backend lifecycle statuses.
  const billable = invoices.filter((i) => i.apiStatus !== 'CANCELLED');
  const totalSales = billable.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidSales = invoices
    .filter((i) => i.apiStatus === 'PAID')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const outstandingSales = invoices
    .filter((i) => i.apiStatus === 'FINALIZED' || i.apiStatus === 'PARTIALLY_PAID')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueSales = invoices.filter(isOverdue).reduce((sum, inv) => sum + inv.totalAmount, 0);

  const filteredInvoices = invoices.filter((inv) => {
    const allowed = STATUS_TAB_TO_API[statusFilter] ?? [];
    if (statusFilter === 'Overdue') {
      if (!isOverdue(inv)) return false;
    } else if (allowed.length > 0 && (!inv.apiStatus || !allowed.includes(inv.apiStatus))) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerGstin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight">
            Sales & Invoicing Workspace
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Generate GST-compliant tax invoices, track credit terms, and manage receivables
          </p>
        </div>

        <button
          onClick={() => navigate('/sales/create-invoice')}
          id="create-invoice-btn"
          className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus size={14} />
          <span>Generate Tax Invoice</span>
        </button>
      </div>

      {/* Sync error / loading banners */}
      {invoicesState.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} />
            Invoice sync error: {getApiErrorMessage(invoicesState.error, 'Could not load invoices.')}
          </span>
          <button
            onClick={() => dispatch(fetchInvoices())}
            className="font-semibold underline hover:no-underline whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}
      {invoicesState.status === 'loading' && invoices.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xs px-4 py-3 text-xs font-mono flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Loading invoices from ledger...
        </div>
      )}

      {/* Sales Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Invoiced
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(totalSales, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            {billable.length} invoices generated
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Outstanding Balance
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(outstandingSales, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-amber-700 font-medium">
            Finalized & awaiting settlement
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Paid & Settled
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1.5">
            {formatINR(paidSales, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-emerald-700">
            Payments recorded against invoices
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Overdue Receivables
          </div>
          <div className="text-xl font-bold font-mono text-red-700 mt-1.5">
            {formatINR(overdueSales, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-red-700 font-bold">
            Past due date, unpaid
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-xs p-4 space-y-4">
        <div className="flex items-center gap-1 border-b border-slate-200 pb-3 overflow-x-auto">
          {Object.keys(STATUS_TAB_TO_API).map((tab) => (
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
              placeholder="Search invoice number, client name, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredInvoices.length} invoices
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left swiss-table border-collapse">
            <thead>
              <tr>
                <th className="w-32">Invoice No</th>
                <th>Customer & GSTIN</th>
                <th className="w-24">Date</th>
                <th className="w-24">Due Date</th>
                <th className="text-right w-28">Taxable Amt</th>
                <th className="text-right w-24">GST</th>
                <th className="text-right w-32">Total Amount</th>
                <th className="text-center w-28">Status</th>
                <th className="text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-mono">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="font-mono font-bold text-slate-900 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="text-xs">
                      <div className="font-semibold text-slate-900">{inv.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        GSTIN: {inv.customerGstin || 'UNREGISTERED'}
                      </div>
                    </td>
                    <td className="font-mono text-slate-600 whitespace-nowrap text-xs">
                      {formatDate(inv.date)}
                    </td>
                    <td className="font-mono text-slate-600 whitespace-nowrap text-xs">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatINR(inv.taxableAmount)}
                    </td>
                    <td className="text-right font-mono text-slate-600 whitespace-nowrap text-xs">
                      {formatINR(inv.cgst + inv.sgst + inv.igst)}
                    </td>
                    <td className="text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs font-semibold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-900'
                            : inv.status === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-900'
                            : inv.status === 'Sent'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {inv.status === 'Sent' && isOverdue(inv) ? 'Overdue' : inv.status}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xs"
                        title="View / Print Tax Invoice"
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

      {/* RECORD PAYMENT MODAL (create + post via dispatch) */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">Record Customer Payment</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedInvoice.invoiceNumber} â€¢ {selectedInvoice.customerName}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount (â‚¹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <div className="mt-1 text-[10px] font-mono text-slate-500">
                    Invoice total: {formatINR(selectedInvoice.totalAmount)}
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Method *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs bg-white font-medium focus:outline-none focus:border-slate-900"
                  >
                    {Object.values(PaymentMethod).map((m) => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
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
              <p className="text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200 rounded-xs p-2.5">
                The payment is allocated fully to this invoice. Posting also books the double entry
                (DR Bank/Cash, CR Accounts Receivable) and updates the invoice status automatically.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => submitPayment(selectedInvoice, false)}
                  className="px-4 py-2 bg-white border border-slate-300 disabled:opacity-50 text-slate-800 hover:bg-slate-50 rounded-xs font-semibold"
                >
                  Save Draft Only
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => submitPayment(selectedInvoice, true)}
                  className="px-5 py-2 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 rounded-xs font-semibold flex items-center gap-2"
                >
                  {busyAction === 'Pay' ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Save & Post Payment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE TAX INVOICE PREVIEW DRAWER */}
      {selectedInvoice && (() => {
        const inv = selectedInvoice;
        const isDraft = inv.apiStatus === 'DRAFT';
        const isFinalized = inv.apiStatus === 'FINALIZED';
        const isPartiallyPaid = inv.apiStatus === 'PARTIALLY_PAID';
        const isCancelled = inv.apiStatus === 'CANCELLED';
        const canFinalize = isDraft && inv.items.length > 0;
        const canCancel = isFinalized || isPartiallyPaid;

        const cust = customers.find((c) => c.id === inv.customerId);
        const invoiceItems = inv.items.map((item: any, idx: number) => {
          const qty = Number(item.quantity) || 1;
          const rate = Number(item.unitPrice || item.rate) || 0;
          const taxable = Number(item.taxableAmount || item.amount) || qty * rate;
          const gstRate = Number(item.taxRate || item.gstRate) || 18;
          const taxAmt = Number(item.taxAmount) || (taxable * gstRate) / 100;
          return {
            id: item.id || `item_${idx}`,
            description: item.description || 'Line Item',
            hsn: item.hsnSac || item.hsn || '9987',
            quantity: qty,
            unit: item.unit || 'NOS',
            rate: rate,
            discountPct: Number(item.discountPct) || 0,
            gstRate: gstRate,
            amount: taxable,
            cgst: inv.isInterState ? 0 : taxAmt / 2,
            sgst: inv.isInterState ? 0 : taxAmt / 2,
            igst: inv.isInterState ? taxAmt : 0,
            total: taxable + taxAmt,
          };
        });

        const drawerFormData: InvoiceFormData = {
          templateId: drawerTemplateId,
          business: {
            name: currentOrg?.name || 'ACME INDUSTRIES PVT LTD',
            tradeName: currentOrg?.tradeName || '',
            gstin: currentOrg?.gstin || '27AABCA1234F1Z5',
            pan: currentOrg?.pan || 'AABCA1234F',
            address: currentOrg?.address || 'Plot 42, MIDC Industrial Area',
            city: currentOrg?.city || 'Mumbai',
            state: currentOrg?.state || 'Maharashtra (27)',
            pincode: currentOrg?.pincode || '400093',
            email: currentOrg?.email || 'billing@acmeindustries.in',
            phone: currentOrg?.phone || '+91 22 4589 0000',
            bankName: currentOrg?.bankName || 'HDFC Bank Ltd',
            accountNumber: currentOrg?.accountNumber || '50200012345678',
            ifscCode: currentOrg?.ifscCode || 'HDFC0000060',
            branch: currentOrg?.branch || 'MIDC Andheri East',
            upiId: currentOrg?.upiId || 'acme@hdfcbank',
          },
          customer: {
            id: inv.customerId,
            name: inv.customerName,
            tradeName: cust?.tradeName || '',
            gstin: inv.customerGstin || cust?.gstin || 'UNREGISTERED',
            pan: cust?.pan || '',
            billingAddress: cust?.address || 'Corporate Park, Industrial Estate',
            shippingAddress: cust?.address || 'Corporate Park, Industrial Estate',
            city: cust?.city || 'Mumbai',
            state: cust?.state || inv.placeOfSupply || 'Maharashtra (27)',
            pincode: '',
            email: cust?.email || '',
            phone: cust?.phone || '',
            placeOfSupply: inv.placeOfSupply || cust?.state || 'Maharashtra (27)',
          },
          metadata: {
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.date,
            dueDate: inv.dueDate,
            poNumber: 'PO-' + (inv.invoiceNumber.replace(/\D/g, '') || '901'),
            paymentTerms: inv.paymentTerms || 'Net 30 Days',
            reverseCharge: !!inv.reverseCharge,
            isInterstate: !!inv.isInterState,
          },
          items: invoiceItems,
          additionalDiscount: 0,
          shippingCharges: 0,
          notes: inv.notes || 'Thank you for your business.',
          termsAndConditions: inv.termsAndConditions || '1. Payment within 30 days of invoice date.\n2. Interest @ 18% p.a. on overdue payments.\n3. Subject to Mumbai Jurisdiction.',
          authorizedSignatory: currentUser?.name || 'Authorized Signatory',
          signatoryTitle: 'Authorized Signatory / Finance Director',
        };

        const drawerCalculations = recalculateInvoice(drawerFormData);

        return (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-2xs"
              onClick={() => setSelectedInvoiceId(null)}
            />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 xs:pl-6 sm:pl-10">
              <div className="w-screen max-w-4xl bg-neutral-100 shadow-2xl border-l border-neutral-200 flex flex-col">
                {/* Drawer Header */}
                <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase bg-neutral-900 text-white px-2 py-0.5 rounded-xs">
                      TAX INVOICE
                    </span>
                    <span className="font-mono font-bold text-neutral-900">{inv.invoiceNumber}</span>
                  </div>

                  {/* Template Switcher Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {INVOICE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setDrawerTemplateId(tpl.id)}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-xs transition-colors ${
                          drawerTemplateId === tpl.id
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {tpl.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 text-neutral-700 hover:text-neutral-900 border border-neutral-300 hover:bg-neutral-50 rounded-xs flex items-center gap-1 text-xs font-mono"
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => setSelectedInvoiceId(null)}
                      className="p-1.5 rounded-xs text-neutral-400 hover:text-neutral-700"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Printable Invoice Body using InvoiceRenderer */}
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                  {inv.items.length === 0 && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xs px-4 py-3 text-xs font-mono">
                      Line items are loading (GET /invoices/:id)...
                    </div>
                  )}
                  <InvoiceRenderer data={drawerFormData} calculations={drawerCalculations} />
                </div>

                {/* Drawer Footer Actions â€” backend lifecycle operations */}
                <div className="p-4 border-t border-neutral-200 bg-white space-y-2">
                  {actionError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center gap-2">
                      <AlertCircle size={13} />
                      {actionError}
                    </div>
                  )}
                  {paySuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs px-3 py-2 text-xs flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={13} />
                        {paySuccess}
                      </span>
                      <button onClick={() => setPaySuccess('')} className="p-0.5 hover:text-emerald-950" title="Dismiss">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {canFinalize && (
                        <button
                          onClick={() => handleFinalize(inv)}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                          title="Issue the invoice: generates the invoice number and posts the double-entry journal"
                        >
                          {busyAction === 'Finalize' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                          <span>Finalize & Issue</span>
                        </button>
                      )}
                      {isDraft && inv.items.length === 0 && (
                        <span className="text-[11px] font-mono text-amber-700">
                          Loading line items before finalize is available...
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const input = window.prompt('Update draft notes', inv.notes || '');
                          if (input === null) return;
                          void runInvoiceAction('Update', () =>
                            dispatch(updateInvoice({ id: inv.id, payload: { notes: input || undefined } })).unwrap(),
                          );
                        }}
                        disabled={busyAction !== null}
                        className="px-3 py-1.5 bg-white disabled:opacity-50 border border-neutral-300 text-neutral-800 hover:bg-neutral-100 text-xs font-medium rounded-xs font-mono flex items-center gap-1.5"
                        title="PATCH /invoices/:id â€” draft notes (full item edits open the editor flow)"
                      >
                        {busyAction === 'Update' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                        <span>Edit Notes</span>
                      </button>
                      {canCancel && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 bg-emerald-700 disabled:opacity-50 text-white hover:bg-emerald-800 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                          title="Record a customer payment against this invoice (creates + posts a payment)"
                        >
                          {busyAction === 'Pay' ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />}
                          <span>Record Payment</span>
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(inv)}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 bg-white disabled:opacity-50 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-xs font-mono flex items-center gap-1.5"
                          title="Cancels the invoice and reverses its posted journal entry"
                        >
                          {busyAction === 'Cancel' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                          <span>Cancel Invoice</span>
                        </button>
                      )}
                      {isDraft && (
                        <button
                          onClick={() => handleDeleteDraft(inv)}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 bg-white disabled:opacity-50 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-medium rounded-xs font-mono flex items-center gap-1.5"
                        >
                          {busyAction === 'Delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          <span>Delete Draft</span>
                        </button>
                      )}
                      {inv.apiStatus === 'PAID' && (
                        <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Fully paid & settled
                        </span>
                      )}
                      {(inv.apiStatus === 'PAID' || inv.apiStatus === 'PARTIALLY_PAID') && (
                        <button
                          onClick={() => {
                            const posted = paymentsState.items.find(
                              (p) =>
                                p.status === PaymentStatus.POSTED &&
                                p.customerId === inv.customerId &&
                                p.allocations?.some((a) => a.invoiceId === inv.id),
                            );
                            if (posted) {
                              handleVoidPayment(inv, posted.id, posted.paymentNumber);
                            } else {
                              setActionError(
                                'No posted payment for this invoice in this session to void. Payments made in earlier sessions cannot be listed because the backend has no GET /payments endpoint.',
                              );
                            }
                          }}
                          disabled={busyAction !== null}
                          className="px-3 py-1.5 bg-white disabled:opacity-50 border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-medium rounded-xs font-mono flex items-center gap-1.5"
                          title="Void a posted payment (reverses its journal entry) â€” limited to payments created in this session"
                        >
                          {busyAction === 'Void' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                          <span>Void Payment</span>
                        </button>
                      )}
                      {isCancelled && (
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                          <Ban size={13} /> Cancelled â€” journal entry reversed
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedInvoiceId(null)}
                      className="px-4 py-1.5 bg-neutral-900 text-white rounded-xs text-xs font-semibold font-mono"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};


