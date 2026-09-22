import React, { useEffect, useMemo, useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ScanLine,
  ShieldCheck,
  Plus,
  Trash2,
  Info,
  X,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { createBill } from '../../features/purchases/purchasesSlice';
import { uploadFile } from '../../features/files/filesSlice';
import { extractBill } from '../../features/ai/aiSlice';
import { createVendor } from '../../features/vendors/vendorsSlice';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { formatINR, validateGSTIN } from '../../utils/formatters';
import type {
  AiExtractionProposal,
  ExtractionWarning,
  FieldConfidence,
} from '../../api/aiTypes';
import type { CreatePurchaseBillDto } from '../../api/purchasesTypes';
import type { CreateVendorDto } from '../../api/vendorsTypes';

interface DocumentScannerViewProps {
  navigate: (route: string) => void;
}

/** Editable review model built from the AI proposal (proposal data only). */
interface ReviewItem {
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  itcEligible: boolean;
}

interface ReviewModel {
  fileName: string;
  fileSize: string;
  supplierName: string;
  supplierGstin: string;
  supplierAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  placeOfSupply: string;
  items: ReviewItem[];
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  warnings: ExtractionWarning[];
  fieldConfidence: FieldConfidence[];
  overallConfidence: number;
}

const num = (v: number | undefined | null): number =>
  v === null || v === undefined || Number.isNaN(v) ? 0 : v;
const str = (v: string | undefined | null): string => v ?? '';

const buildReviewModel = (
  proposal: AiExtractionProposal,
  file: File,
): ReviewModel => {
  const doc = proposal.proposedAction;
  return {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(0)} KB`,
    supplierName: str(doc.supplier?.name),
    supplierGstin: str(doc.supplier?.gstin),
    supplierAddress: str(doc.supplier?.address),
    invoiceNumber: str(doc.invoice?.number),
    invoiceDate: str(doc.invoice?.date),
    dueDate: str(doc.invoice?.dueDate),
    poNumber: str(doc.invoice?.poNumber),
    placeOfSupply: str(doc.invoice?.placeOfSupply),
    items: (doc.items ?? []).map((item) => ({
      description: str(item.description),
      hsn: str(item.hsn),
      quantity: num(item.quantity),
      unit: str(item.unit),
      unitPrice: num(item.unitPrice),
      discount: num(item.discount),
      taxRate: num(item.taxRate),
      taxableAmount: num(item.taxableAmount),
      itcEligible: item.itcEligible !== false,
    })),
    cgst: num(doc.tax?.cgst),
    sgst: num(doc.tax?.sgst),
    igst: num(doc.tax?.igst),
    cess: num(doc.tax?.cess),
    roundOff: num(doc.tax?.roundOff),
    subtotal: num(doc.totals?.subtotal),
    totalDiscount: num(doc.totals?.totalDiscount),
    taxableAmount: num(doc.totals?.taxableAmount),
    totalTax: num(doc.totals?.totalTax),
    grandTotal: num(doc.totals?.grandTotal),
    warnings: proposal.warnings ?? [],
    fieldConfidence: proposal.fieldConfidence ?? [],
    overallConfidence: proposal.overallConfidence ?? 0,
  };
};

const WARNING_STYLES: Record<string, string> = {
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-slate-50 border-slate-200 text-slate-700',
};

const WARNING_ICONS: Record<string, React.ReactNode> = {
  error: <AlertCircle size={13} className="text-red-600 shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />,
  info: <Info size={13} className="text-slate-500 shrink-0 mt-0.5" />,
};

export const DocumentScannerView: React.FC<DocumentScannerViewProps> = ({ navigate }) => {
  const { vendors } = useAccounting();
  const dispatch = useAppDispatch();
  const activeOrganizationId = useAppSelector(
    (state) => state.organizations.activeOrganizationId,
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [review, setReview] = useState<ReviewModel | null>(null);
  const [vendorMatchId, setVendorMatchId] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);

  // Quick Add Vendor modal state (isolated from OCR pipeline)
  const [isQuickAddVendorOpen, setIsQuickAddVendorOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    tradeName: '',
    gstin: '',
    pan: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    paymentTermsDays: '30',
  });
  const [vendorFormError, setVendorFormError] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);

  const openQuickAddVendor = () => {
    const rawGstin = (review?.supplierGstin || '').trim().toUpperCase();
    const panFromGstin = rawGstin.length >= 12 ? rawGstin.slice(2, 12) : '';

    let guessedState = review?.placeOfSupply || '';
    let guessedCity = '';
    if (review?.supplierAddress) {
      const parts = review.supplierAddress.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        guessedCity = parts[parts.length - 2];
      }
    }

    setVendorForm({
      name: review?.supplierName || '',
      tradeName: '',
      gstin: rawGstin,
      pan: panFromGstin,
      contactPerson: '',
      email: '',
      phone: '',
      address: review?.supplierAddress || '',
      city: guessedCity,
      state: guessedState,
      paymentTermsDays: '30',
    });
    setVendorFormError('');
    setIsQuickAddVendorOpen(true);
  };

  const handleQuickAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      setVendorFormError('Please provide a vendor / supplier name.');
      return;
    }
    if (vendorForm.gstin.trim() && !validateGSTIN(vendorForm.gstin.trim()).isValid) {
      setVendorFormError('Invalid GSTIN format (must be 15 characters, e.g. 27AABCA1234F1Z5).');
      return;
    }
    if (!vendorForm.email.trim()) {
      setVendorFormError('Email is required by the accounting service.');
      return;
    }
    if (!vendorForm.phone.trim()) {
      setVendorFormError('Phone number is required by the accounting service.');
      return;
    }
    if (!vendorForm.address.trim()) {
      setVendorFormError('Billing address is required by the accounting service.');
      return;
    }
    if (!vendorForm.city.trim()) {
      setVendorFormError('City is required by the accounting service.');
      return;
    }
    if (!vendorForm.state.trim()) {
      setVendorFormError('State is required by the accounting service.');
      return;
    }

    setIsAddingVendor(true);
    setVendorFormError('');

    try {
      const payload: CreateVendorDto = {
        name: vendorForm.name.trim(),
        ...(vendorForm.tradeName.trim() ? { tradeName: vendorForm.tradeName.trim() } : {}),
        ...(vendorForm.gstin.trim() ? { gstin: vendorForm.gstin.trim().toUpperCase() } : {}),
        ...(vendorForm.pan.trim() ? { pan: vendorForm.pan.trim().toUpperCase() } : {}),
        ...(vendorForm.contactPerson.trim() ? { contactPerson: vendorForm.contactPerson.trim() } : {}),
        email: vendorForm.email.trim(),
        phone: vendorForm.phone.trim(),
        address: vendorForm.address.trim(),
        city: vendorForm.city.trim(),
        state: vendorForm.state.trim(),
        paymentTermsDays: parseInt(vendorForm.paymentTermsDays, 10) || 30,
      };

      const result = await dispatch(createVendor(payload)).unwrap();
      setSelectedVendorId(result.id);
      setVendorMatchId(result.id);
      setIsQuickAddVendorOpen(false);
    } catch (err) {
      setVendorFormError(getApiErrorMessage(err, 'Failed to create vendor.'));
    } finally {
      setIsAddingVendor(false);
    }
  };

  useEffect(() => {
    // Vendor must be resolved by a human — auto-select ONLY the backend's
    // exact-GSTIN match as the default choice, never a blind vendors[0].
    setSelectedVendorId(vendorMatchId ?? '');
  }, [vendorMatchId]);

  const errorWarnings = useMemo(
    () => (review?.warnings ?? []).filter((w) => w.severity === 'error'),
    [review],
  );

  const missingCoreFields = useMemo(() => {
    if (!review) return [] as string[];
    const missing: string[] = [];
    if (!selectedVendorId) missing.push('vendor');
    if (!review.invoiceNumber.trim()) missing.push('invoice number');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.invoiceDate)) missing.push('invoice date');
    if (review.items.length === 0) missing.push('at least one line item');
    if (review.items.some((i) => !i.description.trim() || i.quantity <= 0)) {
      missing.push('complete line items (description + quantity)');
    }
    return missing;
  }, [review, selectedVendorId]);

  const gateReady =
    !!review &&
    missingCoreFields.length === 0 &&
    (errorWarnings.length === 0 || warningsAcknowledged);

  const processFileExtraction = async (file: File) => {
    setIsProcessing(true);
    setReview(null);
    setSubmitStatus('IDLE');
    setErrorMessage('');
    setVendorMatchId(null);
    setDuplicateNotice(null);
    setWarningsAcknowledged(false);

    // The active organization must be resolved before any tenant-scoped
    // upload/extraction request (the backend validates it against both the
    // URL segment and the x-organization-id header).
    if (!activeOrganizationId) {
      setIsProcessing(false);
      setErrorMessage('Your organization is still loading. Try again in a moment.');
      return;
    }

    try {
      const organizationId = activeOrganizationId;
      const uploadResponse = await dispatch(uploadFile({ organizationId, file })).unwrap();
      const fileId = uploadResponse.file.id;

      const proposal = await dispatch(extractBill({ organizationId, fileId })).unwrap();

      setReview(buildReviewModel(proposal, file));
      setVendorMatchId(proposal.vendorMatch?.vendorId ?? null);
      if (proposal.duplicate) {
        setDuplicateNotice(
          `Possible duplicate: purchase bill ${proposal.duplicate.billNumber ?? proposal.duplicate.billId.slice(0, 8)} ` +
          `already exists for vendor invoice "${proposal.duplicate.vendorInvoiceNumber}"` +
          (proposal.duplicate.grandTotal != null
            ? ` (₹${proposal.duplicate.grandTotal})`
            : '') +
          '.',
        );
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to process document'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFileExtraction(file);
    }
    e.target.value = '';
  };

  const patchReview = (patch: Partial<ReviewModel>) => {
    setReview((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchItem = (index: number, patch: Partial<ReviewItem>) => {
    setReview((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setReview((prev) =>
      prev
        ? {
          ...prev,
          items: [
            ...prev.items,
            {
              description: '',
              hsn: '',
              quantity: 1,
              unit: '',
              unitPrice: 0,
              discount: 0,
              taxRate: 18,
              taxableAmount: 0,
              itcEligible: true,
            },
          ],
        }
        : prev,
    );
  };

  const removeItem = (index: number) => {
    setReview((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev,
    );
  };

  const handleConfirmAndCreate = async () => {
    if (!review || !selectedVendorId || submitStatus === 'SUBMITTING') return;
    setSubmitStatus('SUBMITTING');
    setErrorMessage('');

    // Printed tax/totals are review metadata only. The payload carries raw
    // line data (qty, price, discount, rate) and the backend recomputes all
    // authoritative accounting totals in PurchasesService.calculateTotals.
    const isInterState = review.igst > 0 && review.cgst === 0 && review.sgst === 0;
    const payload: CreatePurchaseBillDto = {
      vendorId: selectedVendorId,
      vendorInvoiceNumber: review.invoiceNumber.trim(),
      billDate: review.invoiceDate,
      dueDate: review.dueDate || undefined,
      placeOfSupply: review.placeOfSupply || undefined,
      isInterState,
      itcEligible: true,
      items: review.items.map((item) => ({
        description: item.description.trim(),
        hsn: item.hsn.trim() || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        itcEligible: item.itcEligible,
      })),
    };

    try {
      await dispatch(createBill(payload)).unwrap();
      setSubmitStatus('SUCCESS');
      navigate('/purchases');
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Failed to create the purchase bill.'));
      setSubmitStatus('ERROR');
    }
  };

  const inputCls =
    'w-full px-2 py-1 bg-white border border-slate-300 rounded-xs text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900';
  const labelCls = 'text-[10px] font-sans font-medium text-slate-500 uppercase';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 text-white rounded-xs flex items-center justify-center">
              <ScanLine size={15} />
            </div>
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">
              Document Ingestion &amp; Inward Bill Extraction (OCR)
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">
            AI-extracted invoice data is a proposal — you review and approve; accounting totals are computed by the backend
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Upload Zone (Top, full width) */}
        <div className="w-full space-y-4">
          <input
            type="file"
            onChange={handleFileInputChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            id="native-ocr-file-input"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                await processFileExtraction(file);
              }
            }}
            onClick={() => document.getElementById('native-ocr-file-input')?.click()}
            className={`border-2 border-dashed rounded-xs p-8 text-center cursor-pointer transition-colors bg-white ${isDragging
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-300 hover:border-slate-900 hover:bg-slate-50/50'
              }`}
          >
            <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-900 rounded-xs flex items-center justify-center mx-auto mb-3">
              <UploadCloud size={24} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Upload Tax Invoice or Bill
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Click to browse or drag &amp; drop (PDF, JPG, PNG, WEBP up to 10MB)
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-[11px] font-mono rounded-xs border border-slate-200">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span>Extracts supplier GSTIN, line items &amp; tax breakdown</span>
            </div>
          </div>

          {/* Extraction errors are always visible, even with no review data */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2.5 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">Extraction failed</div>
                <div className="mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}
        </div>

        {/* Extraction & Review Panel (Bottom, full width) */}
        <div className="w-full bg-white border border-slate-200 p-6 rounded-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Extracted Bill &amp; Accounting Review
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Review and correct every field before authorizing the purchase bill
                </p>
              </div>
              {review && (
                <span
                  className={`px-2 py-1 text-[10px] font-mono font-bold rounded-xs flex items-center gap-1 ${review.overallConfidence >= 0.8
                      ? 'bg-emerald-100 text-emerald-900'
                      : review.overallConfidence >= 0.5
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-red-100 text-red-900'
                    }`}
                  title="Advisory score derived from field presence, format validity and arithmetic consistency. Not a guarantee."
                >
                  <Info size={11} />
                  Extraction confidence {Math.round(review.overallConfidence * 100)}% (advisory)
                </span>
              )}
            </div>

            {isProcessing ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-mono text-slate-700 font-bold">
                  Extracting supplier, line items, and tax breakdown...
                </div>
              </div>
            ) : review ? (
              <div className="space-y-4 text-xs font-mono">
                {/* File Badge */}
                <div className="flex items-center justify-between p-2.5 bg-slate-100/70 border border-slate-200 rounded-xs text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-slate-600 shrink-0" />
                    <span className="font-bold text-slate-900 truncate">{review.fileName}</span>
                    <span className="text-slate-500 font-sans">({review.fileSize})</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans uppercase font-bold">AI Parsed</span>
                </div>

                {/* Warnings — never hidden */}
                {review.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">
                      Validation Warnings ({review.warnings.length})
                    </div>
                    {review.warnings.map((w, i) => (
                      <div
                        key={`${w.code}-${i}`}
                        className={`rounded-xs border px-2.5 py-1.5 text-[11px] flex items-start gap-2 ${WARNING_STYLES[w.severity] ?? WARNING_STYLES.info}`}
                      >
                        {WARNING_ICONS[w.severity] ?? WARNING_ICONS.info}
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Duplicate notice */}
                {duplicateNotice && (
                  <div className="rounded-xs border px-2.5 py-1.5 text-[11px] flex items-start gap-2 bg-red-50 border-red-200 text-red-800">
                    <AlertCircle size={13} className="text-red-600 shrink-0 mt-0.5" />
                    <span>{duplicateNotice}</span>
                  </div>
                )}

                {/* Supplier */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-3">
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">Supplier (as printed)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Name</label>
                      <input type="text" value={review.supplierName}
                        onChange={(e) => patchReview({ supplierName: e.target.value })}
                        className={`${inputCls} font-bold mt-0.5`} />
                    </div>
                    <div>
                      <label className={labelCls}>GSTIN</label>
                      <input type="text" value={review.supplierGstin}
                        onChange={(e) => patchReview({ supplierGstin: e.target.value.toUpperCase() })}
                        className={`${inputCls} font-bold mt-0.5`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Address</label>
                    <input type="text" value={review.supplierAddress}
                      onChange={(e) => patchReview({ supplierAddress: e.target.value })}
                      className={`${inputCls} mt-0.5`} />
                  </div>
                </div>

                {/* Vendor assignment */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">
                      Vendor (required)
                    </div>
                    <button
                      type="button"
                      onClick={openQuickAddVendor}
                      id="quick-add-vendor-btn"
                      className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Plus size={12} />
                      <span>Quick Add Vendor</span>
                    </button>
                  </div>

                  {vendorMatchId ? (
                    <div className="text-[11px] flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 size={13} />
                      <span>Matched by GSTIN to your vendor master</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xs">
                      <div className="text-[11px] flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle size={13} className="shrink-0 text-amber-700" />
                        <span>Vendor not found in database. Select an existing vendor or create one:</span>
                      </div>
                      <button
                        type="button"
                        onClick={openQuickAddVendor}
                        className="self-start sm:self-auto text-[11px] font-bold text-amber-900 underline hover:text-amber-950 font-sans cursor-pointer"
                      >
                        + Create "{review.supplierName || 'This Vendor'}"
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className={`${inputCls} flex-1`}
                      id="ocr-vendor-select"
                    >
                      <option value="">— Select vendor —</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}{v.gstin ? ` (${v.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Invoice header */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-3">
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">Invoice</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Invoice Number</label>
                      <input type="text" value={review.invoiceNumber}
                        onChange={(e) => patchReview({ invoiceNumber: e.target.value })}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                    <div>
                      <label className={labelCls}>Invoice Date</label>
                      <input type="date" value={review.invoiceDate}
                        onChange={(e) => patchReview({ invoiceDate: e.target.value })}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                    <div>
                      <label className={labelCls}>Due Date</label>
                      <input type="date" value={review.dueDate}
                        onChange={(e) => patchReview({ dueDate: e.target.value })}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>PO Number</label>
                      <input type="text" value={review.poNumber}
                        onChange={(e) => patchReview({ poNumber: e.target.value })}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                    <div>
                      <label className={labelCls}>Place of Supply</label>
                      <input type="text" value={review.placeOfSupply}
                        onChange={(e) => patchReview({ placeOfSupply: e.target.value })}
                        className={`${inputCls} mt-0.5`} />
                    </div>
                  </div>
                </div>

                {/* Line items */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">
                      Line Items ({review.items.length})
                    </div>
                    <button type="button" onClick={addItem}
                      className="text-[10px] font-mono font-medium px-2 py-1 border border-slate-300 hover:bg-white rounded-xs flex items-center gap-1 text-slate-700">
                      <Plus size={11} /> Add Row
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-slate-500 text-left">
                          <th className="py-1 pr-2 font-medium">Description</th>
                          <th className="py-1 pr-2 font-medium">HSN</th>
                          <th className="py-1 pr-2 font-medium">Qty</th>
                          <th className="py-1 pr-2 font-medium">Unit</th>
                          <th className="py-1 pr-2 font-medium">Unit ₹</th>
                          <th className="py-1 pr-2 font-medium">Disc ₹</th>
                          <th className="py-1 pr-2 font-medium">GST %</th>
                          <th className="py-1 pr-2 font-medium">Taxable ₹</th>
                          <th className="py-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {review.items.map((item, index) => (
                          <tr key={index} className="border-t border-slate-200/70">
                            <td className="py-1 pr-2">
                              <input type="text" value={item.description}
                                onChange={(e) => patchItem(index, { description: e.target.value })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-16">
                              <input type="text" value={item.hsn}
                                onChange={(e) => patchItem(index, { hsn: e.target.value })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-16">
                              <input type="number" step="0.0001" min="0" value={item.quantity}
                                onChange={(e) => patchItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-14">
                              <input type="text" value={item.unit}
                                onChange={(e) => patchItem(index, { unit: e.target.value })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-20">
                              <input type="number" step="0.01" min="0" value={item.unitPrice}
                                onChange={(e) => patchItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-20">
                              <input type="number" step="0.01" min="0" value={item.discount}
                                onChange={(e) => patchItem(index, { discount: parseFloat(e.target.value) || 0 })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-16">
                              <input type="number" step="0.01" min="0" value={item.taxRate}
                                onChange={(e) => patchItem(index, { taxRate: parseFloat(e.target.value) || 0 })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 pr-2 w-24">
                              <input type="number" step="0.01" min="0" value={item.taxableAmount}
                                onChange={(e) => patchItem(index, { taxableAmount: parseFloat(e.target.value) || 0 })}
                                className={inputCls} />
                            </td>
                            <td className="py-1 w-6">
                              <button type="button" onClick={() => removeItem(index)}
                                title="Remove line item"
                                className="text-slate-400 hover:text-red-600">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tax + totals (printed values — backend recomputes on creation) */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-3">
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">Tax (as printed)</div>
                  <div className="grid grid-cols-5 gap-2">
                    {([
                      ['CGST', 'cgst'],
                      ['SGST', 'sgst'],
                      ['IGST', 'igst'],
                      ['CESS', 'cess'],
                      ['Round-off', 'roundOff'],
                    ] as const).map(([label, key]) => (
                      <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <input type="number" step="0.01" value={review[key]}
                          onChange={(e) => patchReview({ [key]: parseFloat(e.target.value) || 0 } as Partial<ReviewModel>)}
                          className={`${inputCls} mt-0.5`} />
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase pt-1">
                    Totals (as printed)
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {([
                      ['Subtotal', 'subtotal'],
                      ['Discount', 'totalDiscount'],
                      ['Taxable', 'taxableAmount'],
                      ['Total Tax', 'totalTax'],
                      ['Grand Total', 'grandTotal'],
                    ] as const).map(([label, key]) => (
                      <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <input type="number" step="0.01" value={review[key]}
                          onChange={(e) => patchReview({ [key]: parseFloat(e.target.value) || 0 } as Partial<ReviewModel>)}
                          className={`${inputCls} mt-0.5 ${key === 'grandTotal' ? 'font-bold' : ''}`} />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-sm font-bold text-slate-950">
                    <span className="font-sans">Printed Grand Total:</span>
                    <span>{formatINR(review.grandTotal)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Printed values are kept for review. When you confirm, the backend recomputes all accounting
                    totals from the line items above — printed values never post to the ledger.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs font-mono">
                Upload a vendor bill on the left to extract and review its fields.
              </div>
            )}
          </div>

          {review && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              {/* Human review gate */}
              {errorWarnings.length > 0 && (
                <label className="flex items-start gap-2 text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-xs px-2.5 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={warningsAcknowledged}
                    onChange={(e) => setWarningsAcknowledged(e.target.checked)}
                    className="mt-0.5 accent-red-700"
                  />
                  <span>
                    I have reviewed the {errorWarnings.length} critical warning{errorWarnings.length > 1 ? 's' : ''} above
                    and confirm this bill should still be created.
                  </span>
                </label>
              )}

              {missingCoreFields.length > 0 && (
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xs px-2.5 py-2 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Required before creating the bill: {missingCoreFields.join(', ')}.</span>
                </div>
              )}

              {submitStatus === 'ERROR' && errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xs px-3 py-2 text-xs flex items-center gap-2">
                  <AlertCircle size={13} />{errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReview(null);
                    setVendorMatchId(null);
                    setDuplicateNotice(null);
                    setWarningsAcknowledged(false);
                    setErrorMessage('');
                    setSubmitStatus('IDLE');
                  }}
                  disabled={submitStatus === 'SUBMITTING'}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xs text-xs font-medium"
                >
                  Clear
                </button>

                <button
                  type="button"
                  disabled={!gateReady || submitStatus === 'SUBMITTING'}
                  onClick={handleConfirmAndCreate}
                  id="confirm-post-ocr-btn"
                  title={gateReady ? '' : 'Resolve the review requirements above first'}
                  className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xs text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  {submitStatus === 'SUBMITTING' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Purchase Bill...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Create Bill</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Vendor Modal */}
      {isQuickAddVendorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xs shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">
                  Quick Add Vendor / Supplier
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Pre-filled with scanned OCR invoice details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddVendorOpen(false)}
                className="p-1 rounded-xs hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickAddVendorSubmit} className="p-6 space-y-4 text-xs font-sans">
              {vendorFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xs flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{vendorFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Vendor Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. FAB TECH INDUSTRIES"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={vendorForm.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const pan = val.length >= 12 ? val.slice(2, 12) : vendorForm.pan;
                      setVendorForm((prev) => ({ ...prev, gstin: val, pan }));
                    }}
                    placeholder="27AABCA1234F1Z5"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    value={vendorForm.pan}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                    placeholder="AABCA1234F"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="accounts@vendor.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Billing Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Gala No. 2, Lake Road, Bhandup"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorForm.city}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorForm.state}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="Maharashtra (27)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsQuickAddVendorOpen(false)}
                  disabled={isAddingVendor}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xs text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingVendor}
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xs text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isAddingVendor ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Vendor...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Save &amp; Link to Scanned Bill</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
