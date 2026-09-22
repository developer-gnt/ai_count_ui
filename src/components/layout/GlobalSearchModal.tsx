import React, { useState, useEffect } from 'react';
import { Search, X, Receipt, CreditCard, Users, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { formatINR } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (route: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  navigate,
}) => {
  const { invoices, transactions, customers, vendors, expenses } = useAccounting();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = (query || '').toLowerCase().trim();

  const safeIncludes = (val: unknown, term: string): boolean => {
    if (val === null || val === undefined) return false;
    return String(val).toLowerCase().includes(term);
  };

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const matchedInvoices = q
    ? safeInvoices.filter(
        (i) =>
          i &&
          (safeIncludes(i.invoiceNumber, q) ||
            safeIncludes(i.customerName, q) ||
            safeIncludes(i.customerGstin, q))
      )
    : [];

  const matchedTransactions = q
    ? safeTransactions.filter(
        (t) =>
          t &&
          (safeIncludes(t.description, q) ||
            safeIncludes(t.partyName, q) ||
            safeIncludes(t.referenceNo, q) ||
            safeIncludes(t.partyGstin, q))
      )
    : [];

  const matchedCustomers = q
    ? safeCustomers.filter(
        (c) =>
          c &&
          (safeIncludes(c.name, q) ||
            safeIncludes(c.tradeName, q) ||
            safeIncludes(c.gstin, q) ||
            safeIncludes(c.email, q) ||
            safeIncludes(c.phone, q) ||
            safeIncludes(c.city, q) ||
            safeIncludes(c.state, q))
      )
    : [];

  const matchedVendors = q
    ? safeVendors.filter(
        (v) =>
          v &&
          (safeIncludes(v.name, q) ||
            safeIncludes(v.tradeName, q) ||
            safeIncludes(v.gstin, q) ||
            safeIncludes(v.contactPerson, q) ||
            safeIncludes(v.email, q) ||
            safeIncludes(v.phone, q) ||
            safeIncludes(v.city, q))
      )
    : [];

  const matchedExpenses = q
    ? safeExpenses.filter(
        (e) =>
          e &&
          (safeIncludes(e.description, q) ||
            safeIncludes(e.vendorName, q) ||
            safeIncludes(e.category, q) ||
            safeIncludes(e.referenceNo, q))
      )
    : [];

  const hasResults =
    matchedInvoices.length > 0 ||
    matchedTransactions.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedVendors.length > 0 ||
    matchedExpenses.length > 0;

  const handleSelect = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-white border border-slate-300 shadow-2xl rounded-xs w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search invoices (e.g. INV-1024), parties, GSTINs, expenses..."
            className="w-full text-sm font-sans focus:outline-none placeholder:text-slate-400 text-slate-900"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 text-xs">
          {!query ? (
            <div className="py-8 text-center text-slate-500">
              <div className="text-slate-400 text-xs mb-2">Quick Navigation Shortcuts</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg mx-auto">
                <button
                  onClick={() => handleSelect('/sales')}
                  className="p-2.5 border border-slate-200 rounded-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium text-slate-800"
                >
                  <Receipt size={14} className="text-slate-600" />
                  <span>Sales & Invoices</span>
                </button>
                <button
                  onClick={() => handleSelect('/expenses')}
                  className="p-2.5 border border-slate-200 rounded-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium text-slate-800"
                >
                  <CreditCard size={14} className="text-slate-600" />
                  <span>Expenses</span>
                </button>
                <button
                  onClick={() => handleSelect('/gst')}
                  className="p-2.5 border border-slate-200 rounded-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium text-slate-800"
                >
                  <FileText size={14} className="text-slate-600" />
                  <span>GST Summary</span>
                </button>
                <button
                  onClick={() => handleSelect('/customers')}
                  className="p-2.5 border border-slate-200 rounded-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium text-slate-800"
                >
                  <Users size={14} className="text-slate-600" />
                  <span>Customers</span>
                </button>
              </div>
            </div>
          ) : !hasResults ? (
            <div className="py-12 text-center text-slate-500">
              <p className="font-medium text-slate-800">No records found matching "{query}"</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try searching by GSTIN (e.g. 27AABCA), Invoice ID (e.g. INV-1025), or Vendor name.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invoices */}
              {matchedInvoices.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Invoices ({matchedInvoices.length})
                  </div>
                  <div className="space-y-1">
                    {matchedInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => handleSelect('/sales')}
                        className="w-full text-left p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Receipt size={14} className="text-slate-500 shrink-0" />
                          <div>
                            <span className="font-mono font-semibold text-slate-900">
                              {inv.invoiceNumber}
                            </span>{' '}
                            <span className="text-slate-600">• {inv.customerName}</span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              GSTIN: {inv.customerGstin} • Date: {inv.date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold text-slate-900">
                            {formatINR(inv.totalAmount)}
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1 py-0.5 rounded-xs ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : inv.status === 'Overdue'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {matchedCustomers.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Customers ({matchedCustomers.length})
                  </div>
                  <div className="space-y-1">
                    {matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect('/customers')}
                        className="w-full text-left p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users size={14} className="text-slate-500 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900">{c.name}</span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              GSTIN: {c.gstin} • {c.city}, {c.state}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-slate-500 text-[10px]">Outstanding</div>
                          <div className="font-semibold text-slate-900">{formatINR(c.outstandingBalance)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendors */}
              {matchedVendors.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Vendors ({matchedVendors.length})
                  </div>
                  <div className="space-y-1">
                    {matchedVendors.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleSelect('/vendors')}
                        className="w-full text-left p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Briefcase size={14} className="text-slate-500 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900">{v.name}</span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              GSTIN: {v.gstin} • {v.city}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-slate-500 text-[10px]">Payables</div>
                          <div className="font-semibold text-slate-900">{formatINR(v.payablesBalance)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses */}
              {matchedExpenses.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Expenses ({matchedExpenses.length})
                  </div>
                  <div className="space-y-1">
                    {matchedExpenses.map((exp) => (
                      <button
                        key={exp.id}
                        onClick={() => handleSelect('/expenses')}
                        className="w-full text-left p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xs flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <CreditCard size={14} className="text-slate-500 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900">{exp.description}</span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {exp.vendorName} • {exp.category}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono font-semibold text-slate-900">
                          {formatINR(exp.amount)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate using search keywords or shortcuts</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </div>
  );
};
