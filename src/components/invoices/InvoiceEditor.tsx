import React, { useState, useRef } from 'react';
import {
  InvoiceFormData,
  InvoiceItemForm,
  InvoiceCalculations,
} from './types';
import { formatINR, numberToWordsIndian } from '../../utils/formatters';
import { useAccounting } from '../../context/AccountingContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { uploadFile } from '../../features/files/filesSlice';
import { extractBill } from '../../features/ai/aiSlice';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import {
  Building2,
  Calendar,
  User,
  Package,
  Calculator,
  CreditCard,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Eye,
  Sparkles,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  Percent,
  Truck,
  FileText,
} from 'lucide-react';

interface InvoiceEditorProps {
  formData: InvoiceFormData;
  calculations: InvoiceCalculations;
  onChange: (updated: InvoiceFormData) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onPreview: () => void;
}

const STEPS = [
  { number: 1, id: 'company', label: '01 Company', title: 'Company Information', subtitle: 'Review and verify your registered legal entity, tax, and billing details.' },
  { number: 2, id: 'details', label: '02 Invoice Details', title: 'Invoice Details', subtitle: 'Configure invoice numbering, issuance dates, payment timeline, and supply regime.' },
  { number: 3, id: 'customer', label: '03 Customer', title: 'Customer & Consignee', subtitle: 'Select an existing client or enter customer billing and shipping information.' },
  { number: 4, id: 'items', label: '04 Items', title: 'Goods & Service Items', subtitle: 'Add line items with HSN/SAC codes, quantities, unit prices, discounts, and GST rates.' },
  { number: 5, id: 'totals', label: '05 Taxes & Totals', title: 'Taxes & Totals Summary', subtitle: 'Review taxable values, GST breakdown, apply discounts or freight, and verify the grand total.' },
  { number: 6, id: 'payment', label: '06 Payment & Notes', title: 'Payment Remittance & Notes', subtitle: 'Set bank transfer details, customer remarks, terms & conditions, and authorized signatory.' },
];

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  formData,
  calculations,
  onChange,
  currentStep,
  setCurrentStep,
  onPreview,
}) => {
  const { customers, currentOrg } = useAccounting();
  const dispatch = useAppDispatch();
  const activeOrganizationId = useAppSelector(
    (state) => state.organizations.activeOrganizationId,
  );

  // OCR state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string>('');
  const [ocrErrorMsg, setOcrErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper updaters
  const updateBusiness = (field: keyof typeof formData.business, val: string) => {
    onChange({
      ...formData,
      business: { ...formData.business, [field]: val },
    });
  };

  const updateCustomer = (field: keyof typeof formData.customer, val: string) => {
    onChange({
      ...formData,
      customer: { ...formData.customer, [field]: val },
    });
  };

  const updateMeta = (field: keyof typeof formData.metadata, val: any) => {
    onChange({
      ...formData,
      metadata: { ...formData.metadata, [field]: val },
    });
  };

  // Select customer from list & auto-fill
  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const isCustomerInterstate =
      !cust.state.toLowerCase().includes('maharashtra') &&
      !cust.state.startsWith('27');

    onChange({
      ...formData,
      customer: {
        ...formData.customer,
        id: cust.id,
        name: cust.name,
        tradeName: cust.tradeName || '',
        gstin: cust.gstin,
        pan: cust.pan || '',
        billingAddress: cust.address,
        shippingAddress: cust.address,
        city: cust.city,
        state: cust.state,
        pincode: '',
        email: cust.email,
        phone: cust.phone,
        contactPerson: cust.contactPerson || '',
        placeOfSupply: cust.state,
      },
      metadata: {
        ...formData.metadata,
        isInterstate: isCustomerInterstate,
      },
    });
  };

  // Line item manipulation
  const updateItem = (index: number, field: keyof InvoiceItemForm, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discountPct) || 0;
    const gstRate = Number(item.gstRate) || 0;

    const base = qty * rate;
    const lineDiscount = (base * discount) / 100;
    const taxable = base - lineDiscount;
    const taxAmt = (taxable * gstRate) / 100;

    item.amount = taxable;
    item.total = taxable + taxAmt;

    if (formData.metadata.isInterstate) {
      item.cgst = 0;
      item.sgst = 0;
      item.igst = taxAmt;
    } else {
      item.cgst = taxAmt / 2;
      item.sgst = taxAmt / 2;
      item.igst = 0;
    }

    updatedItems[index] = item;
    onChange({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    const newItem: InvoiceItemForm = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      description: '',
      hsn: '9987',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      discountPct: 0,
      gstRate: 18,
      amount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
    };
    onChange({ ...formData, items: [...formData.items, newItem] });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const updated = formData.items.filter((_, i) => i !== index);
      onChange({ ...formData, items: updated });
    }
  };

  // AI OCR extraction handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsScanning(true);
    setOcrSuccessMsg('');
    setOcrErrorMsg('');

    const orgId = activeOrganizationId || currentOrg?.id;
    if (!orgId) {
      setIsScanning(false);
      setOcrErrorMsg('Organization profile is still loading. Please try again.');
      return;
    }

    try {
      const uploadRes = await dispatch(uploadFile({ organizationId: orgId, file })).unwrap();
      const proposal = await dispatch(extractBill({ organizationId: orgId, fileId: uploadRes.file.id })).unwrap();
      const doc = proposal.proposedAction;

      const mappedItems: InvoiceItemForm[] = (doc.items || []).map((it, idx) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.unitPrice) || 0;
        const disc = Number(it.discount) || 0;
        const taxRate = Number(it.taxRate) || 18;
        const taxable = qty * rate * (1 - disc / 100);
        const taxVal = (taxable * taxRate) / 100;
        const isInter = Boolean(doc.tax?.igst && doc.tax.igst > 0);

        return {
          id: `ocr_item_${idx}_${Date.now()}`,
          description: it.description || `Item #${idx + 1}`,
          hsn: it.hsn || '9987',
          quantity: qty,
          unit: it.unit || 'NOS',
          rate: rate,
          discountPct: disc,
          gstRate: taxRate,
          amount: taxable,
          cgst: isInter ? 0 : taxVal / 2,
          sgst: isInter ? 0 : taxVal / 2,
          igst: isInter ? taxVal : 0,
          total: taxable + taxVal,
        };
      });

      const isInterstate = Boolean(doc.tax?.igst && doc.tax.igst > 0);

      onChange({
        ...formData,
        customer: {
          ...formData.customer,
          name: doc.supplier?.name || formData.customer.name,
          gstin: doc.supplier?.gstin || formData.customer.gstin,
          billingAddress: doc.supplier?.address || formData.customer.billingAddress,
          placeOfSupply: doc.invoice?.placeOfSupply || formData.customer.placeOfSupply,
        },
        metadata: {
          ...formData.metadata,
          invoiceNumber: doc.invoice?.number || formData.metadata.invoiceNumber,
          invoiceDate: doc.invoice?.date || formData.metadata.invoiceDate,
          dueDate: doc.invoice?.dueDate || formData.metadata.dueDate,
          poNumber: doc.invoice?.poNumber || formData.metadata.poNumber,
          isInterstate: isInterstate,
        },
        items: mappedItems.length > 0 ? mappedItems : formData.items,
        additionalDiscount: doc.totals?.totalDiscount || formData.additionalDiscount,
      });

      setOcrSuccessMsg(
        `✓ Successfully extracted invoice data (${mappedItems.length} items found). Form fields have been updated for review.`
      );
    } catch (err) {
      setOcrErrorMsg(getApiErrorMessage(err, 'Failed to extract invoice data.'));
    } finally {
      setIsScanning(false);
    }
  };

  const currentStepMeta = STEPS.find((s) => s.number === currentStep) || STEPS[0];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Top Numbered Step Navigation Ribbon */}
      <nav
        aria-label="Form Progress Steps"
        className="bg-white border border-neutral-200 rounded-sm shadow-2xs p-2 overflow-x-auto"
      >
        <div className="flex items-center min-w-[620px] justify-between gap-1">
          {STEPS.map((step) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.number)}
                className={`flex-1 py-2 px-2.5 rounded-xs text-xs font-mono transition-all flex items-center justify-center gap-1.5 whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : isCompleted
                    ? 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {isCompleted ? (
                  <Check size={13} strokeWidth={3} className="text-emerald-500 shrink-0" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white text-neutral-950 font-bold' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {step.number}
                  </span>
                )}
                <span className="truncate">{step.label.replace(/^\d+\s*/, '')}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* AI INVOICE SCANNER (Clearly Separated Section) */}
      <div className="bg-white border border-neutral-200 rounded-sm p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xs bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 shrink-0 mt-0.5">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900">
                  AI Invoice Scanner
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.2 bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-2xs">
                  OCR Assisted
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Scan an existing vendor invoice and automatically extract invoice details for review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <button
              type="button"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-mono font-semibold rounded-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 size={14} className="animate-spin text-neutral-900" />
                  <span>Extracting Data...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={14} className="text-neutral-700" />
                  <span>Upload Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scan Status Banners */}
        {ocrSuccessMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs text-[11px] font-mono flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
            <span>{ocrSuccessMsg}</span>
          </div>
        )}
        {ocrErrorMsg && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xs text-[11px] font-mono flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <span>{ocrErrorMsg}</span>
          </div>
        )}
      </div>

      {/* CURRENT STEP FORM CONTAINER (Centered Professional SaaS Wizard) */}
      <div className="bg-white border border-neutral-200 rounded-sm shadow-2xs overflow-hidden">
        {/* Step Header */}
        <div className="border-b border-neutral-100 px-6 py-4 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-neutral-400">
              STEP 0{currentStep} OF 06
            </span>
            <h3 className="text-base font-bold text-neutral-950 font-sans tracking-tight">
              {currentStepMeta.title}
            </h3>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              {currentStepMeta.subtitle}
            </p>
          </div>

          {currentStep === 1 && (
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600" />
              ✓ Company Information Pre-filled
            </span>
          )}
        </div>

        {/* Step Body (ONE STEP VISIBLE AT A TIME) */}
        <div className="p-6">
          {/* ========================================================================= */}
          {/* STEP 1: COMPANY INFORMATION */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Company Name / Legal Entity *
                  </label>
                  <input
                    type="text"
                    value={formData.business.name}
                    onChange={(e) => updateBusiness('name', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-semibold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. ACME INDUSTRIES PVT LTD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Trade Name / Brand Name
                  </label>
                  <input
                    type="text"
                    value={formData.business.tradeName || ''}
                    onChange={(e) => updateBusiness('tradeName', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. ACME Precision"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Registered GSTIN (15 Digits) *
                  </label>
                  <input
                    type="text"
                    value={formData.business.gstin}
                    onChange={(e) => updateBusiness('gstin', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="27AABCA1234F1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    PAN (Permanent Account Number)
                  </label>
                  <input
                    type="text"
                    value={formData.business.pan}
                    onChange={(e) => updateBusiness('pan', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="AABCA1234F"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Business Address *
                </label>
                <input
                  type="text"
                  value={formData.business.address}
                  onChange={(e) => updateBusiness('address', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                  placeholder="Street, Industrial Area, Building No"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.business.city}
                    onChange={(e) => updateBusiness('city', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    State (with State Code)
                  </label>
                  <input
                    type="text"
                    value={formData.business.state}
                    onChange={(e) => updateBusiness('state', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Maharashtra (27)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={formData.business.pincode}
                    onChange={(e) => updateBusiness('pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="400093"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formData.business.email}
                    onChange={(e) => updateBusiness('email', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="billing@company.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone / Helpline
                  </label>
                  <input
                    type="text"
                    value={formData.business.phone}
                    onChange={(e) => updateBusiness('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="+91 22 2839 4000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: INVOICE DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Invoice Serial Number *
                  </label>
                  <input
                    type="text"
                    value={formData.metadata.invoiceNumber}
                    onChange={(e) => updateMeta('invoiceNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="INV/2026/001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={formData.metadata.invoiceDate}
                    onChange={(e) => updateMeta('invoiceDate', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    value={formData.metadata.dueDate}
                    onChange={(e) => updateMeta('dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.metadata.paymentTerms}
                    onChange={(e) => updateMeta('paymentTerms', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs bg-white text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 45 Days">Net 45 Days</option>
                    <option value="Net 60 Days">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Purchase Order (PO) / Reference
                  </label>
                  <input
                    type="text"
                    value={formData.metadata.poNumber || ''}
                    onChange={(e) => updateMeta('poNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. PO-2026-9041"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Place of Supply (POS)
                  </label>
                  <input
                    type="text"
                    value={formData.customer.placeOfSupply}
                    onChange={(e) => updateCustomer('placeOfSupply', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. Maharashtra (27)"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-neutral-900 block font-mono">
                      GST Supply Regime
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {formData.metadata.isInterstate
                        ? 'Inter-State Supply (IGST applied)'
                        : 'Intra-State Supply (CGST + SGST applied)'}
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={formData.metadata.isInterstate}
                      onChange={(e) => {
                        const isInter = e.target.checked;
                        const updatedItems = formData.items.map((item) => {
                          const taxable = item.amount;
                          const gstRate = item.gstRate;
                          const taxAmt = (taxable * gstRate) / 100;
                          return {
                            ...item,
                            cgst: isInter ? 0 : taxAmt / 2,
                            sgst: isInter ? 0 : taxAmt / 2,
                            igst: isInter ? taxAmt : 0,
                          };
                        });
                        onChange({
                          ...formData,
                          metadata: { ...formData.metadata, isInterstate: isInter },
                          items: updatedItems,
                        });
                      }}
                      className="rounded-2xs text-neutral-900 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-neutral-800">Inter-State Supply (IGST)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                  <input
                    type="checkbox"
                    id="reverse-charge-chk"
                    checked={formData.metadata.reverseCharge}
                    onChange={(e) => updateMeta('reverseCharge', e.target.checked)}
                    className="rounded-2xs text-neutral-900 focus:ring-0 w-4 h-4"
                  />
                  <label htmlFor="reverse-charge-chk" className="text-xs text-neutral-700 cursor-pointer">
                    Tax is payable on Reverse Charge basis (RCM under GST)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: CUSTOMER / BUYER */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {customers.length > 0 && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-neutral-900 font-mono">Quick Customer Select:</span>
                    <span className="text-neutral-500 ml-1.5 hidden sm:inline">
                      Auto-fill details from your registered client database.
                    </span>
                  </div>

                  <select
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="px-2.5 py-1.5 border border-neutral-300 rounded-xs bg-white text-xs font-medium text-neutral-800 focus:outline-none focus:border-neutral-900 min-w-[220px]"
                  >
                    <option value="">-- Choose Registered Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.gstin})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Customer Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer.name}
                    onChange={(e) => updateCustomer('name', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-semibold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. Quantum Dynamics Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Customer Trade Name / Brand
                  </label>
                  <input
                    type="text"
                    value={formData.customer.tradeName || ''}
                    onChange={(e) => updateCustomer('tradeName', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. Quantum Labs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Customer GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    value={formData.customer.gstin}
                    onChange={(e) => updateCustomer('gstin', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Customer PAN
                  </label>
                  <input
                    type="text"
                    value={formData.customer.pan || ''}
                    onChange={(e) => updateCustomer('pan', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Billing Address *
                  </label>
                  <textarea
                    rows={2}
                    value={formData.customer.billingAddress}
                    onChange={(e) => updateCustomer('billingAddress', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Street, Tower, Area"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Shipping Address / Consignee
                  </label>
                  <textarea
                    rows={2}
                    value={formData.customer.shippingAddress || ''}
                    onChange={(e) => updateCustomer('shippingAddress', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Leave blank if same as billing address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.customer.city}
                    onChange={(e) => updateCustomer('city', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Bengaluru"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.customer.state}
                    onChange={(e) => updateCustomer('state', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Karnataka (29)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.customer.email || ''}
                    onChange={(e) => updateCustomer('email', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="accounts@client.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.customer.phone || ''}
                    onChange={(e) => updateCustomer('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="+91 80 4123 4567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: ITEMS */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Line Items ({formData.items.length})
                </span>

                <button
                  type="button"
                  onClick={addItem}
                  id="add-item-btn"
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xs font-mono text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={13} />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-200 font-mono text-[10px] text-neutral-600 uppercase">
                      <th className="p-2 text-left w-7">#</th>
                      <th className="p-2 text-left">Item / Service Description *</th>
                      <th className="p-2 text-center w-20">HSN/SAC</th>
                      <th className="p-2 text-right w-16">Qty</th>
                      <th className="p-2 text-center w-20">Unit</th>
                      <th className="p-2 text-right w-24">Rate (₹)</th>
                      <th className="p-2 text-right w-16">Disc %</th>
                      <th className="p-2 text-center w-20">Tax</th>
                      <th className="p-2 text-right w-24">Amount</th>
                      <th className="p-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {formData.items.map((item, idx) => {
                      const qty = Number(item.quantity) || 0;
                      const rate = Number(item.rate) || 0;
                      const disc = Number(item.discountPct) || 0;
                      const taxable = qty * rate * (1 - disc / 100);

                      return (
                        <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                          <td className="p-2 text-neutral-400 font-mono text-center">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              placeholder="Description..."
                              className="w-full px-2 py-1 border border-neutral-300 rounded-xs text-neutral-900 font-medium text-xs focus:outline-none focus:border-neutral-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.hsn}
                              onChange={(e) => updateItem(idx, 'hsn', e.target.value)}
                              placeholder="9987"
                              className="w-full px-1.5 py-1 border border-neutral-300 rounded-xs font-mono text-center text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 border border-neutral-300 rounded-xs font-mono text-right font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-full px-1 py-1 border border-neutral-300 rounded-xs font-mono text-neutral-800 bg-white text-[11px] focus:outline-none focus:border-neutral-900"
                            >
                              <option value="NOS">NOS</option>
                              <option value="PCS">PCS</option>
                              <option value="SET">SET</option>
                              <option value="KGS">KGS</option>
                              <option value="MTR">MTR</option>
                              <option value="HRS">HRS</option>
                              <option value="MONTH">MONTH</option>
                              <option value="JOB">JOB</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.rate}
                              onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 border border-neutral-300 rounded-xs font-mono text-right text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPct}
                              onChange={(e) => updateItem(idx, 'discountPct', parseFloat(e.target.value) || 0)}
                              className="w-full px-1.5 py-1 border border-neutral-300 rounded-xs font-mono text-right text-neutral-700 text-xs focus:outline-none focus:border-neutral-900"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={item.gstRate}
                              onChange={(e) => updateItem(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 py-1 border border-neutral-300 rounded-xs font-mono text-center text-neutral-900 bg-white text-xs font-semibold focus:outline-none focus:border-neutral-900"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-neutral-900 whitespace-nowrap text-xs">
                            {formatINR(taxable)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              disabled={formData.items.length <= 1}
                              className="p-1 text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Remove line item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: TAXES & TOTALS */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Additional charges / discount adjustments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xs border border-neutral-200">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-neutral-500 shrink-0" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Special Additional Discount (₹):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.additionalDiscount}
                      onChange={(e) => onChange({ ...formData, additionalDiscount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-xs font-mono text-right text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-neutral-500 shrink-0" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Shipping / Freight Charges (₹):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.shippingCharges}
                      onChange={(e) => onChange({ ...formData, shippingCharges: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-xs font-mono text-right text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Comprehensive Totals Breakdown */}
              <div className="bg-neutral-50/70 border border-neutral-200 rounded-xs p-5 font-mono text-xs space-y-2.5">
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="font-sans">Subtotal (Base Item Sum):</span>
                  <span className="font-semibold text-neutral-900">{formatINR(calculations.subtotal)}</span>
                </div>

                {calculations.itemDiscounts > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="font-sans">Line Item Discounts:</span>
                    <span>- {formatINR(calculations.itemDiscounts)}</span>
                  </div>
                )}

                {calculations.additionalDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span className="font-sans">Special Additional Discount:</span>
                    <span>- {formatINR(calculations.additionalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 border-t border-neutral-200 text-neutral-800">
                  <span className="font-sans font-medium">Net Taxable Amount:</span>
                  <span className="font-bold text-neutral-950">{formatINR(calculations.taxableAmount)}</span>
                </div>

                {formData.metadata.isInterstate ? (
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-sans">Integrated GST (IGST):</span>
                    <span>{formatINR(calculations.totalIgst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-neutral-700">
                      <span className="font-sans">Central GST (CGST):</span>
                      <span>{formatINR(calculations.totalCgst)}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-700">
                      <span className="font-sans">State GST (SGST):</span>
                      <span>{formatINR(calculations.totalSgst)}</span>
                    </div>
                  </>
                )}

                {calculations.shippingCharges > 0 && (
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="font-sans">Shipping & Handling:</span>
                    <span>{formatINR(calculations.shippingCharges)}</span>
                  </div>
                )}

                {calculations.roundOff !== 0 && (
                  <div className="flex justify-between items-center text-neutral-500 text-[11px]">
                    <span className="font-sans">Round Off Adjustment:</span>
                    <span>{calculations.roundOff > 0 ? `+${calculations.roundOff.toFixed(2)}` : calculations.roundOff.toFixed(2)}</span>
                  </div>
                )}

                {/* Grand Total Highlight Card */}
                <div className="pt-3 border-t-2 border-neutral-900 mt-2">
                  <div className="bg-neutral-900 text-white p-4 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-mono block">
                        Invoice Grand Total (INR)
                      </span>
                      <span className="text-[11px] text-neutral-300 font-sans italic">
                        {numberToWordsIndian(calculations.grandTotal)}
                      </span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {formatINR(calculations.grandTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: PAYMENT & NOTES */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.business.bankName}
                    onChange={(e) => updateBusiness('bankName', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="HDFC Bank"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.business.accountNumber}
                    onChange={(e) => updateBusiness('accountNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="50200012345678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={formData.business.ifscCode}
                    onChange={(e) => updateBusiness('ifscCode', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="HDFC0001234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    UPI VPA / ID
                  </label>
                  <input
                    type="text"
                    value={formData.business.upiId || ''}
                    onChange={(e) => updateBusiness('upiId', e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-mono text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="company@hdfcbank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={formData.termsAndConditions}
                    onChange={(e) => onChange({ ...formData, termsAndConditions: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs font-mono focus:outline-none focus:border-neutral-900"
                    placeholder="1. Goods once sold will not be returned..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Customer Notes / Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => onChange({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Thank you for your business..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Authorized Signatory Name
                  </label>
                  <input
                    type="text"
                    value={formData.authorizedSignatory}
                    onChange={(e) => onChange({ ...formData, authorizedSignatory: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs font-semibold text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Authorized Officer Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Signatory Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.signatoryTitle}
                    onChange={(e) => onChange({ ...formData, signatoryTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xs text-neutral-700 text-xs focus:outline-none focus:border-neutral-900"
                    placeholder="Managing Director / Finance Head"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xs border border-neutral-200 text-[11px] text-neutral-500 font-sans italic">
                Declaration: We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.
              </div>
            </div>
          )}
        </div>

        {/* Step Bottom Navigation Bar */}
        <div className="border-t border-neutral-200 px-6 py-4 bg-neutral-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            id="wizard-prev-btn"
            className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-700 text-xs font-mono font-medium rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Previous</span>
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              id="wizard-continue-btn"
              className="px-5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-mono font-semibold rounded-xs flex items-center gap-2 transition-colors shadow-xs"
            >
              <span>Continue to {STEPS[currentStep].title}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onPreview}
              id="wizard-preview-btn"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-bold rounded-xs flex items-center gap-2 transition-colors shadow-xs"
            >
              <Eye size={15} />
              <span>Preview Complete Invoice →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
