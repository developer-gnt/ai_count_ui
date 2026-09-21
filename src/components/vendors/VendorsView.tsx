import React, { useState, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchVendors,
  fetchVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../../features/vendors/vendorsSlice';
import { formatINR, validateGSTIN } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import type { Vendor, CreateVendorDto } from '../../api/vendorsTypes';

interface VendorsViewProps {
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
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  paymentTermsDays: '30',
};

export const VendorsView: React.FC<VendorsViewProps> = ({ navigate }) => {
  const dispatch = useAppDispatch();
  const { items: vendors, status, error: reduxError } = useAppSelector((state) => state.vendors);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedVendor = selectedVendorId
    ? vendors.find((v) => v.id === selectedVendorId) ?? null
    : null;

  useEffect(() => {
    dispatch(fetchVendors());
  }, [dispatch]);

  const setField =
    (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const openAddModal = () => {
    setForm(emptyForm);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditVendorId(vendor.id);
    setForm({
      name: vendor.name,
      tradeName: vendor.tradeName ?? '',
      gstin: vendor.gstin ?? '',
      pan: vendor.pan ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      city: vendor.city ?? '',
      state: vendor.state ?? '',
      bankName: vendor.bankName ?? '',
      bankAccount: vendor.bankAccount ?? '',
      bankIfsc: vendor.bankIfsc ?? '',
      paymentTermsDays: String(vendor.paymentTermsDays ?? 30),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openDetail = (vendor: Vendor) => {
    setSelectedVendorId(vendor.id);
    // Re-fetch from the backend so the detail view shows server state.
    dispatch(fetchVendorById(vendor.id));
  };

  // The backend CreateVendorDto requires email, phone, address, city and
  // state as non-empty strings, so validate before dispatching and strip
  // optional fields that are blank rather than sending empty strings.
  const buildPayload = (): CreateVendorDto => ({
    name: form.name.trim(),
    ...(form.tradeName.trim() ? { tradeName: form.tradeName.trim() } : {}),
    ...(form.gstin.trim() ? { gstin: form.gstin.toUpperCase().trim() } : {}),
    ...(form.pan.trim() ? { pan: form.pan.toUpperCase().trim() } : {}),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    ...(form.bankName.trim() ? { bankName: form.bankName.trim() } : {}),
    ...(form.bankAccount.trim() ? { bankAccount: form.bankAccount.trim() } : {}),
    ...(form.bankIfsc.trim() ? { bankIfsc: form.bankIfsc.toUpperCase().trim() } : {}),
    ...(form.paymentTermsDays ? { paymentTermsDays: parseInt(form.paymentTermsDays, 10) || 30 } : {}),
  });

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return 'Please provide a legal supplier / vendor name.';
    }
    if (form.gstin && !validateGSTIN(form.gstin).isValid) {
      return 'Invalid GSTIN format.';
    }
    if (!form.email.trim()) {
      return 'A finance email is required by the accounting service.';
    }
    if (!form.phone.trim()) {
      return 'A phone number is required by the accounting service.';
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

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await dispatch(createVendor(buildPayload())).unwrap();
      setIsAddModalOpen(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to create vendor.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendorId) {
      setFormError('No vendor selected for update.');
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
      await dispatch(updateVendor({ id: editVendorId, payload: buildPayload() })).unwrap();
      setIsEditModalOpen(false);
      setEditVendorId(null);
      setForm(emptyForm);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to update vendor.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!window.confirm('Delete this vendor master record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await dispatch(deleteVendor(id)).unwrap();
      if (selectedVendorId === id) setSelectedVendorId(null);
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to delete vendor.'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        (v.gstin ?? '').toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPayables = vendors.reduce((sum, v) => sum + (v.outstandingBalance ?? 0), 0);
  const gstinValidation = validateGSTIN(form.gstin);

  const renderFormFields = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleUpdateVendor : handleAddVendor} className="p-6 space-y-4 text-xs">
      <div>
        <label className="block font-medium text-slate-700 mb-1">
          Vendor / Supplier Legal Name *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Precision Components Pvt Ltd"
          value={form.name}
          onChange={setField('name')}
          className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900 uppercase font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            GSTIN (15-char) *
          </label>
          <input
            type="text"
            maxLength={15}
            required
            placeholder="27AABCV8812K1Z9"
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
            PAN Number *
          </label>
          <input
            type="text"
            maxLength={10}
            required
            placeholder="AABCV8812K"
            value={form.pan}
            onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase().replace(/\s/g, '') }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono uppercase focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Finance Email *
          </label>
          <input
            type="email"
            required
            placeholder="accounts@supplier.in"
            value={form.email}
            onChange={setField('email')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Phone *
          </label>
          <input
            type="text"
            required
            placeholder="+91 20 2745 0000"
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
          placeholder="Plot 22, MIDC Industrial Area"
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

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Bank Name
          </label>
          <input
            type="text"
            placeholder="State Bank of India"
            value={form.bankName}
            onChange={setField('bankName')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            placeholder="30992384920"
            value={form.bankAccount}
            onChange={setField('bankAccount')}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono focus:outline-none focus:border-slate-900"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            IFSC Code
          </label>
          <input
            type="text"
            maxLength={11}
            placeholder="SBIN0001234"
            value={form.bankIfsc}
            onChange={(e) => setForm((prev) => ({ ...prev, bankIfsc: e.target.value.toUpperCase() }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono uppercase focus:outline-none focus:border-slate-900"
          />
        </div>
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
          {submitting ? 'Saving…' : isEdit ? 'Update Vendor Record' : 'Save Vendor Record'}
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
            Vendor Directory & Accounts Payable
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Supplier master records, bank remittance details, and purchase liabilities
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="add-vendor-btn"
          className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xs flex items-center gap-2 transition-colors"
        >
          <Plus size={14} />
          <span>Add Supplier / Vendor</span>
        </button>
      </div>

      {/* Redux-level error banner */}
      {reduxError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xs">
          <span>Vendor sync error: {reduxError}</span>
          <button
            onClick={() => dispatch(fetchVendors())}
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Registered Suppliers
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {vendors.length} Vendors
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            GSTIN validated for ITC claim
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Total Outstanding Payables
          </div>
          <div className="text-xl font-bold font-mono text-slate-950 mt-1.5">
            {formatINR(totalPayables, false)}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            Current liability on ledger
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xs">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Vendor Banking Details
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1.5">
            {vendors.filter((v) => v.bankAccount).length} Configured
          </div>
          <div className="mt-1 text-[10px] font-mono text-emerald-700">
            Direct RTGS/NEFT enabled
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 relative max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, GSTIN, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredVendors.length} vendors
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white border border-slate-200 rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left swiss-table border-collapse">
            <thead>
              <tr>
                <th>Vendor / Supplier Name</th>
                <th>GSTIN & PAN</th>
                <th>Bank Remittance Info</th>
                <th>Contact</th>
                <th className="text-right w-32">Outstanding Payable</th>
                <th className="text-center w-24">Terms</th>
                <th className="text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' && vendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-xs text-slate-500 font-mono py-8">
                    Loading vendors from server…
                  </td>
                </tr>
              )}
              {status !== 'loading' && vendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-xs text-slate-500 font-mono py-8">
                    No vendors found. Use “Add Supplier / Vendor” to create the first record.
                  </td>
                </tr>
              )}
              {filteredVendors.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => openDetail(v)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td>
                    <div className="font-semibold text-slate-950 text-xs">{v.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {v.city}, {v.state}
                    </div>
                  </td>
                  <td className="text-xs font-mono text-slate-800">
                    <div>{v.gstin ?? '—'}</div>
                    <div className="text-[10px] text-slate-500">PAN: {v.pan ?? '—'}</div>
                  </td>
                  <td className="text-xs font-mono text-slate-600">
                    <div>{v.bankName || '—'}</div>
                    <div className="text-[10px] text-slate-400">
                      A/c: {v.bankAccount ? `•••• ${v.bankAccount.slice(-4)}` : '—'} {v.bankIfsc ? `(${v.bankIfsc})` : ''}
                    </div>
                  </td>
                  <td className="text-xs text-slate-600">
                    <div>{v.email}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{v.phone}</div>
                  </td>
                  <td
                    className={`text-right font-mono font-bold whitespace-nowrap ${
                      (v.outstandingBalance ?? 0) > 0 ? 'text-slate-950' : 'text-slate-500'
                    }`}
                  >
                    {formatINR(v.outstandingBalance ?? 0)}
                  </td>
                  <td className="text-center whitespace-nowrap">
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-800 rounded-xs">
                      Net {v.paymentTermsDays ?? 30}d
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate('/purchases')}
                      className="text-[11px] font-semibold text-slate-900 hover:underline mr-3"
                    >
                      Inward Bill
                    </button>
                    <button
                      onClick={() => openEditModal(v)}
                      className="text-[11px] font-semibold text-slate-900 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(v.id)}
                      disabled={deletingId === v.id}
                      className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === v.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Detail Modal (fetched fresh via GET /vendors/{id}) */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">Vendor Details</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedVendor.id}</p>
              </div>
              <button
                onClick={() => setSelectedVendorId(null)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Legal Name:</span> <span className="font-semibold text-slate-950">{selectedVendor.name}</span></div>
                <div><span className="text-slate-500">GSTIN:</span> <span className="font-mono text-slate-950">{selectedVendor.gstin ?? '—'}</span></div>
                <div><span className="text-slate-500">PAN:</span> <span className="font-mono text-slate-950">{selectedVendor.pan ?? '—'}</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="text-slate-950">{selectedVendor.email}</span></div>
                <div><span className="text-slate-500">Phone:</span> <span className="text-slate-950">{selectedVendor.phone}</span></div>
                <div><span className="text-slate-500">Address:</span> <span className="text-slate-950">{selectedVendor.address || '—'}</span></div>
                <div><span className="text-slate-500">City / State:</span> <span className="text-slate-950">{selectedVendor.city}, {selectedVendor.state}</span></div>
                <div><span className="text-slate-500">Bank:</span> <span className="text-slate-950">{selectedVendor.bankName || '—'} {selectedVendor.bankIfsc ? `(${selectedVendor.bankIfsc})` : ''}</span></div>
                <div><span className="text-slate-500">Payable Due:</span> <span className="font-mono text-slate-950">{formatINR(selectedVendor.outstandingBalance ?? 0)}</span></div>
                <div><span className="text-slate-500">Payment Terms:</span> <span className="font-mono text-slate-950">Net {selectedVendor.paymentTermsDays ?? 30}d</span></div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedVendorId(null);
                    openEditModal(selectedVendor);
                  }}
                  className="px-4 py-2 bg-slate-950 text-white hover:bg-slate-800 rounded-xs font-semibold"
                >
                  Edit Vendor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal → POST /vendors via createVendor() */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Add Vendor / Supplier Master
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Master setup for GST inward bills & RTGS payouts
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

      {/* Edit Vendor Modal → PATCH /vendors/{id} via updateVendor() */}
      {isEditModalOpen && editVendorId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">Edit Vendor</h3>
                <p className="text-xs text-slate-500 font-mono">{editVendorId}</p>
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
