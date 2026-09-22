import React, { useState, useEffect } from 'react';
import {
  InvoiceFormData,
  InvoiceTemplateId,
  InvoiceCalculations,
} from './types';
import {
  INITIAL_MOCK_INVOICE,
  recalculateInvoice,
  INVOICE_TEMPLATES,
} from './mockInvoiceData';
import { InvoiceEditor } from './InvoiceEditor';
import { InvoiceLivePreview } from './InvoiceLivePreview';
import { useAccounting } from '../../context/AccountingContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  createInvoice,
} from '../../features/invoices/invoicesSlice';
import { toCreateInvoiceRequestFromForm } from '../../features/invoices/invoiceMappers';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { formatINR } from '../../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Printer,
  RotateCcw,
  X,
  FileCheck,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface InvoiceCreationFlowProps {
  onBackToSales?: () => void;
  onInvoiceCreated?: (invoiceId: string) => void;
}

export const InvoiceCreationFlow: React.FC<InvoiceCreationFlowProps> = ({
  onBackToSales,
  onInvoiceCreated,
}) => {
  const { currentOrg } = useAccounting();
  const dispatch = useAppDispatch();
  const apiCustomers = useAppSelector((state) => state.customers.items);

  // High-level mode: 'wizard' (Form only) vs 'preview' (Full invoice preview)
  // CRITICAL: Initial load starts directly in 'wizard' mode with NO preview rendered.
  const [editorMode, setEditorMode] = useState<'wizard' | 'preview'>('wizard');
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Invoice form draft state - single persistent source of truth
  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    const base = { ...INITIAL_MOCK_INVOICE };
    if (currentOrg) {
      base.business = {
        name: currentOrg.name || base.business.name,
        tradeName: currentOrg.tradeName || base.business.tradeName,
        gstin: currentOrg.gstin || base.business.gstin,
        pan: currentOrg.pan || base.business.pan,
        address: currentOrg.address || base.business.address,
        city: currentOrg.city || base.business.city,
        state: currentOrg.state || base.business.state,
        pincode: currentOrg.pincode || base.business.pincode,
        email: currentOrg.email || base.business.email,
        phone: currentOrg.phone || base.business.phone,
        bankName: currentOrg.bankName || base.business.bankName,
        accountNumber: currentOrg.accountNumber || base.business.accountNumber,
        ifscCode: currentOrg.ifscCode || base.business.ifscCode,
        branch: currentOrg.branch || base.business.branch,
        upiId: currentOrg.upiId || base.business.upiId,
      };
    }
    return base;
  });

  // Keep company information synced with currentOrg if it loads or changes
  useEffect(() => {
    if (currentOrg) {
      setFormData((prev) => ({
        ...prev,
        business: {
          name: currentOrg.name || prev.business.name,
          tradeName: currentOrg.tradeName || prev.business.tradeName,
          gstin: currentOrg.gstin || prev.business.gstin,
          pan: currentOrg.pan || prev.business.pan,
          address: currentOrg.address || prev.business.address,
          city: currentOrg.city || prev.business.city,
          state: currentOrg.state || prev.business.state,
          pincode: currentOrg.pincode || prev.business.pincode,
          email: currentOrg.email || prev.business.email,
          phone: currentOrg.phone || prev.business.phone,
          bankName: currentOrg.bankName || prev.business.bankName,
          accountNumber: currentOrg.accountNumber || prev.business.accountNumber,
          ifscCode: currentOrg.ifscCode || prev.business.ifscCode,
          branch: currentOrg.branch || prev.business.branch,
          upiId: currentOrg.upiId || prev.business.upiId,
        },
      }));
    }
  }, [currentOrg]);

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');

  // Success modal state — the invoice returned by the backend
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    templateId: InvoiceTemplateId;
  } | null>(null);

  // Recalculate calculations live
  const calculations: InvoiceCalculations = recalculateInvoice(formData);

  // Handle save & generate invoice — dispatches POST /invoices through the invoicesSlice thunk
  const handleGenerateInvoice = async () => {
    if (isSaving) return;

    const customerId = formData.customer.id && apiCustomers.some((c) => c.id === formData.customer.id)
      ? formData.customer.id
      : '';
    if (!customerId) {
      setSaveError(
        'Please select a registered customer in Step 3 (Customer) before saving.',
      );
      setEditorMode('wizard');
      setWizardStep(3);
      return;
    }
    if (!formData.items.some((item) => item.description.trim())) {
      setSaveError('Please add at least one line item with a description in Step 4 (Items).');
      setEditorMode('wizard');
      setWizardStep(4);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const created = await dispatch(
        createInvoice(toCreateInvoiceRequestFromForm(formData, customerId)),
      ).unwrap();

      setGeneratedInvoice({
        id: created.id,
        invoiceNumber: created.invoiceNumber,
        customerName: created.customerNameSnapshot || formData.customer.name,
        grandTotal: Number(created.grandTotal),
        templateId: formData.templateId,
      });
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Failed to create the invoice draft.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset this invoice draft to sample default values?')) {
      const base = { ...INITIAL_MOCK_INVOICE };
      if (currentOrg) {
        base.business = {
          name: currentOrg.name || base.business.name,
          tradeName: currentOrg.tradeName || base.business.tradeName,
          gstin: currentOrg.gstin || base.business.gstin,
          pan: currentOrg.pan || base.business.pan,
          address: currentOrg.address || base.business.address,
          city: currentOrg.city || base.business.city,
          state: currentOrg.state || base.business.state,
          pincode: currentOrg.pincode || base.business.pincode,
          email: currentOrg.email || base.business.email,
          phone: currentOrg.phone || base.business.phone,
          bankName: currentOrg.bankName || base.business.bankName,
          accountNumber: currentOrg.accountNumber || base.business.accountNumber,
          ifscCode: currentOrg.ifscCode || base.business.ifscCode,
          branch: currentOrg.branch || base.business.branch,
          upiId: currentOrg.upiId || base.business.upiId,
        };
      }
      setFormData(base);
      setWizardStep(1);
    }
  };

  const selectedTemplateMeta =
    INVOICE_TEMPLATES.find((t) => t.id === formData.templateId) ||
    INVOICE_TEMPLATES[0];

  // ==========================================
  // FULL-WIDTH DEDICATED PREVIEW MODE
  // (Rendered ONLY after user explicitly clicks "Preview Invoice")
  // ==========================================
  if (editorMode === 'preview') {
    return (
      <>
        <InvoiceLivePreview
          formData={formData}
          calculations={calculations}
          onSelectTemplate={(templateId) => setFormData((prev) => ({ ...prev, templateId }))}
          onBackToEdit={() => setEditorMode('wizard')}
          onSaveDraft={handleGenerateInvoice}
          isSaving={isSaving}
        />

        {/* SUCCESS CONFIRMATION MODAL */}
        {generatedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xs border border-neutral-300 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center font-sans">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={24} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-neutral-950">
                  Invoice Draft Saved to Ledger!
                </h3>
                <p className="text-xs text-neutral-500 mt-1 font-mono">
                  {generatedInvoice.invoiceNumber} • {generatedInvoice.customerName}
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xs border border-neutral-200 font-mono text-xs space-y-1.5 text-left">
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-sans">Grand Total:</span>
                  <span className="font-bold text-neutral-950">{formatINR(generatedInvoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-sans">Applied Template:</span>
                  <span className="font-semibold text-neutral-800 uppercase">{selectedTemplateMeta.number} - {selectedTemplateMeta.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-sans">Status:</span>
                  <span className="text-amber-700 font-bold">DRAFT (unissued)</span>
                </div>
                <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200 font-sans">
                  Open the invoice in Sales and press <strong>Finalize &amp; Issue</strong> to post the official journal entry.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xs text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer size={13} />
                  <span>Print PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGeneratedInvoice(null);
                    if (onInvoiceCreated) {
                      onInvoiceCreated(generatedInvoice.id);
                    } else if (onBackToSales) {
                      onBackToSales();
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xs text-xs font-mono font-semibold transition-colors"
                >
                  View in Sales →
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==========================================
  // INITIAL PAGE: MULTI-STEP WIZARD FORM ONLY
  // (NO PREVIEW RENDERED)
  // ==========================================
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      {/* Top Application Header Bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          {onBackToSales && (
            <button
              type="button"
              onClick={onBackToSales}
              id="back-to-sales-btn"
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-mono font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
              title="Return to Sales"
            >
              <ArrowLeft size={14} />
              <span>← Back</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <span>Create Tax Invoice</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300">
                  Draft
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Building2 size={12} className="text-neutral-500" />
                {currentOrg?.name || formData.business.name || 'ACME INDUSTRIES PVT LTD'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2">
          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 rounded-xs transition-colors"
            title="Reset to sample"
          >
            <RotateCcw size={14} />
          </button>

          {/* Save Draft Button */}
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={isSaving}
            id="generate-invoice-btn"
            className="px-4 py-1.5 bg-neutral-950 hover:bg-neutral-900 disabled:opacity-50 text-white rounded-xs font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FileCheck size={14} />
                <span>Save Draft ({formatINR(calculations.grandTotal, false)})</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Save error banner */}
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 sm:px-6 py-2.5 text-xs flex items-center justify-between gap-3 font-mono">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-600 shrink-0" />
            {saveError}
          </span>
          <button onClick={() => setSaveError('')} className="p-1 hover:text-red-950" title="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Wizard Form Container (FORM ONLY) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <InvoiceEditor
          formData={formData}
          calculations={calculations}
          onChange={setFormData}
          currentStep={wizardStep}
          setCurrentStep={setWizardStep}
          onPreview={() => setEditorMode('preview')}
        />
      </main>

      {/* SUCCESS CONFIRMATION MODAL */}
      {generatedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xs border border-neutral-300 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-950">
                Invoice Draft Saved to Ledger!
              </h3>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                {generatedInvoice.invoiceNumber} • {generatedInvoice.customerName}
              </p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xs border border-neutral-200 font-mono text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-sans">Grand Total:</span>
                <span className="font-bold text-neutral-950">{formatINR(generatedInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-sans">Applied Template:</span>
                <span className="font-semibold text-neutral-800 uppercase">{selectedTemplateMeta.number} - {selectedTemplateMeta.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-sans">Status:</span>
                <span className="text-amber-700 font-bold">DRAFT (unissued)</span>
              </div>
              <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200 font-sans">
                Open the invoice in Sales and press <strong>Finalize &amp; Issue</strong> to post the official journal entry.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xs text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer size={13} />
                <span>Print PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGeneratedInvoice(null);
                  if (onInvoiceCreated) {
                    onInvoiceCreated(generatedInvoice.id);
                  } else if (onBackToSales) {
                    onBackToSales();
                  }
                }}
                className="flex-1 py-2 px-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xs text-xs font-mono font-semibold transition-colors"
              >
                View in Sales →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
