import React, { useState, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../features/customers/customersSlice';
import { formatINR, validateGSTIN } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import type { Customer, CreateCustomerDto } from '../../api/customersTypes';

interface CustomersViewProps {
  navigate: (route: string) => void;
}

const emptyForm = {
  name: '',
  tradeName: '',
  gstin: '',
  pan: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  creditLimit: '0',
  paymentTermsDays: '30',
};

export const CustomersView: React.FC<CustomersViewProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const { items: customers, status, error: reduxError } = useAppSelector((state) => state.customers);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId) ?? null
    : null;

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const setField = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const openEditModal = (cust: Customer) => {
    setEditCustomerId(cust.id);
    setForm({
      name: cust.name,
      tradeName: cust.tradeName ?? '',
      gstin: cust.gstin ?? '',
      pan: cust.pan ?? '',
      email: cust.email ?? '',
      phone: cust.phone ?? '',
      address: cust.address ?? '',
      city: cust.city ?? '',
      state: cust.state ?? '',
      creditLimit: String(cust.creditLimit ?? 0),
      paymentTermsDays: String(cust.paymentTermsDays ?? 30),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openDetail = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    // Re-fetch from the backend so the detail view shows server state.
    dispatch(fetchCustomerById(cust.id));
  };

  // The backend CreateCustomerDto requires email, phone, address, city and
  // state as non-empty strings, so validate before dispatching and strip
  // optional fields that are blank rather than sending empty strings.
  const buildPayload = (): CreateCustomerDto => ({
    name: form.name.trim(),
    ...(form.tradeName.trim() ? { tradeName: form.tradeName.trim() } : {}),
    ...(form.gstin.trim() ? { gstin: form.gstin.toUpperCase().trim() } : {}),
    ...(form.pan.trim() ? { pan: form.pan.toUpperCase().trim() } : {}),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    ...(form.creditLimit ? { creditLimit: parseFloat(form.creditLimit) || 0 } : {}),
    paymentTermsDays: parseInt(form.paymentTermsDays, 10) || 30,
  });

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return 'Please provide a legal customer company name.';
    }
    if (form.gstin && !validateGSTIN(form.gstin).isValid) {
      return 'Invalid GSTIN format.';
    }
    if (!form.email.trim()) {
      return 'A finance / accounts email is required by the accounting service.';
    }
    if (!form.phone.trim()) {
      return 'A phone / contact number is required by the accounting service.';
    }
    if (!form.address.trim()) {
      return 'A billing address is required by the accounting service.';
    }
    if (!form.city.trim()) {
      return 'City is required by the accounting service.';
    }
    if (!form.state.trim()) {
      return 'State is required by the accounting service.';
    }
    return null;
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await dispatch(createCustomer(buildPayload())).unwrap();
      setIsAddModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to create customer.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomerId) {
      setFormError('No customer selected for update.');
      return;
    }
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await dispatch(
        updateCustomer({ id: editCustomerId, payload: buildPayload() })
      ).unwrap();
      setIsEditModalOpen(false);
      setEditCustomerId(null);
      setForm(emptyForm);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to update customer.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Delete this customer master record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      if (selectedCustomerId === id) setSelectedCustomerId(null);
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to delete customer.'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.gstin ?? '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance ?? 0), 0);
  const gstinValidation = validateGSTIN(form.gstin);

  const renderFormFields = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleUpdateCustomer : handleAddCustomer} className="p-6 space-y-4 text-xs">
      <div>
        <label className="block font-medium text-slate-700 mb-1">
          Customer Legal Business Name *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Tata Motors Limited"
          value={form.name}
          onChange={setField('name')}
          className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 uppercase font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            GSTIN (15-characters)
          </label>
          <input
            type="text"
            maxLength={15}
            placeholder="27AABCT9981F1Z2"
            value={form.gstin}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/\s/g, '');
              setForm((prev) => ({
                ...prev,
                gstin: val,
                pan: val.length >= 12 ? val.substring(2, 12) : prev.pan,
              }));
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono uppercase focus:outline-none focus:border-slate-900"
          />
          {form.gstin && !gstinValidation.isValid && (
            <p className="mt-1 text-[10px] text-red-600 font-mono">{gstinValidation.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            PAN Number
          </label>
          <input
            type="text"
            maxLength={10}
            placeholder="AABCT9981F"
            value={form.pan}
            onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase().replace(/\s/g, '') }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono uppercase focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Finance / Accounts Email *
          </label>
          <input
            type="email"
            required
            placeholder="billing@tatamotors.com"
            value={form.email}
            onChange={setField('email')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Phone / Contact *
          </label>
          <input
            type="text"
            required
            placeholder="+91 22 6656 1234"
            value={form.phone}
            onChange={setField('phone')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">
          Billing Address *
        </label>
        <input
          type="text"
          required
          placeholder="Plot 10, Industrial Estate"
          value={form.address}
          onChange={setField('address')}
          className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">City *</label>
          <input
            type="text"
            required
            value={form.city}
            onChange={setField('city')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">State & Code *</label>
          <input
            type="text"
            required
            value={form.state}
            onChange={setField('state')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Credit Limit (INR ₹)
          </label>
          <input
            type="number"
            value={form.creditLimit}
            onChange={setField('creditLimit')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Payment Terms (Days)
          </label>
          <select
            value={form.paymentTermsDays}
            onChange={setField('paymentTermsDays')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900 bg-white"
          >
            <option value="0">Immediate / Advance</option>
            <option value="15">Net 15 Days</option>
            <option value="30">Net 30 Days</option>
            <option value="45">Net 45 Days</option>
            <option value="60">Net 60 Days</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => (isEdit ? setIsEditModalOpen(false) : setIsAddModalOpen(false))}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xs hover:bg-slate-50 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-slate-950 text-white hover:bg-slate-800 rounded-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? 'Saving…'
            : isEdit
              ? 'Update Customer Record'
              : 'Save Customer Record'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight">
            Customer Directory & Accounts Receivable
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Client master registry, GST state classification, credit terms & ledger tracking
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="add-customer-btn"
          className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors"
        >
          <Plus size={14} />
          <span>Add Customer Master</span>
        </button>
      </div>

      {/* Redux-level error banner */}
      {reduxError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xs">
          <span>Customer sync error: {reduxError}</span>
          <button
            onClick={() => dispatch(fetchCustomers())}
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary metric */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Active Accounts
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {customers.length} Companies
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            All registered for B2B GST e-invoicing
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Receivables
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1.5">
            {formatINR(totalOutstanding, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            Across active commercial accounts
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Average Credit Terms
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            30 Days
          </div>
          <div className="mt-1 text-[10px] font-mono text-emerald-700">
            92% on-time settlement index
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 relative max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, GSTIN, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredCustomers.length} of {customers.length} parties
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left swiss-table border-collapse">
            <thead>
              <tr>
                <th>Customer Legal Name</th>
                <th>GSTIN & State</th>
                <th>Contact Details</th>
                <th className="text-right w-28">Credit Limit</th>
                <th className="text-right w-32">Receivable Due</th>
                <th className="text-center w-24">Terms</th>
                <th className="text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' && customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-xs text-slate-500 font-mono py-8">
                    Loading customers from server…
                  </td>
                </tr>
              )}
              {status !== 'loading' && customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-xs text-slate-500 font-mono py-8">
                    No customers found. Use “Add Customer Master” to create the first record.
                  </td>
                </tr>
              )}
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => openDetail(cust)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td>
                    <div className="font-semibold text-slate-950 text-xs">{cust.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {cust.city}, {cust.state}
                    </div>
                  </td>
                  <td className="text-xs font-mono text-slate-800">
                    <div>{cust.gstin ?? '—'}</div>
                    <div className="text-[10px] text-slate-500">PAN: {cust.pan ?? '—'}</div>
                  </td>
                  <td className="text-xs text-slate-600">
                    <div>{cust.email}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{cust.phone}</div>
                  </td>
                  <td className="text-right font-mono text-slate-700 text-xs">
                    {formatINR(cust.creditLimit ?? 0, false)}
                  </td>
                  <td
                    className={`text-right font-mono font-bold whitespace-nowrap ${
                      (cust.outstandingBalance ?? 0) > 0 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {formatINR(cust.outstandingBalance ?? 0)}
                  </td>
                  <td className="text-center whitespace-nowrap">
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-800 rounded-xs">
                      Net {cust.paymentTermsDays}d
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate('/sales')}
                      className="text-[11px] font-semibold text-slate-900 hover:underline mr-3"
                    >
                      New Invoice
                    </button>
                    <button
                      onClick={() => openEditModal(cust)}
                      className="text-[11px] font-semibold text-slate-900 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(cust.id)}
                      disabled={deletingId === cust.id}
                      className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === cust.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal (fetched fresh via GET /customers/{id}) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">Customer Details</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedCustomer.id}</p>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Legal Name:</span> <span className="font-semibold text-slate-950">{selectedCustomer.name}</span></div>
                <div><span className="text-slate-500">GSTIN:</span> <span className="font-mono text-slate-950">{selectedCustomer.gstin ?? '—'}</span></div>
                <div><span className="text-slate-500">PAN:</span> <span className="font-mono text-slate-950">{selectedCustomer.pan ?? '—'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="text-slate-950">{selectedCustomer.email}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="text-slate-950">{selectedCustomer.phone}</span></div>
                <div><span className="text-slate-500">Address:</span> <span className="text-slate-950">{selectedCustomer.address || '—'}</span></div>
                <div><span className="text-slate-500">City / State:</span> <span className="text-slate-950">{selectedCustomer.city}, {selectedCustomer.state}</span></div>
                <div><span className="text-slate-500">Credit Limit:</span> <span className="font-mono text-slate-950">{formatINR(selectedCustomer.creditLimit ?? 0, false)}</span></div>
                <div><span className="text-slate-500">Receivable Due:</span> <span className="font-mono text-amber-700">{formatINR(selectedCustomer.outstandingBalance ?? 0)}</span></div>
                <div><span className="text-slate-500">Payment Terms:</span> <span className="font-mono text-slate-950">Net {selectedCustomer.paymentTermsDays}d</span></div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedCustomerId(null);
                    openEditModal(selectedCustomer);
                  }}
                  className="px-4 py-2 bg-slate-950 text-white hover:bg-slate-800 rounded-xs font-semibold"
                >
                  Edit Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal → POST /customers via createCustomer() */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Add Customer Master Record
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Master registry for GST B2B invoicing
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs border-b border-red-200">
                {formError}
              </div>
            )}

            {renderFormFields(false)}
          </div>
        </div>
      )}

      {/* Edit Customer Modal → PATCH /customers/{id} via updateCustomer() */}
      {isEditModalOpen && editCustomerId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">Edit Customer</h3>
                <p className="text-xs text-slate-500 font-mono">{editCustomerId}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs border-b border-red-200">
                {formError}
              </div>
            )}

            {renderFormFields(true)}
          </div>
        </div>
      )}
    </div>
  );
};
