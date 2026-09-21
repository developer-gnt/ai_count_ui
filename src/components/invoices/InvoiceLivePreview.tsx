import React, { useState } from 'react';
import { InvoiceFormData, InvoiceCalculations, InvoiceTemplateId } from './types';
import { INVOICE_TEMPLATES } from './mockInvoiceData';
import { InvoiceRenderer } from './templates/InvoiceRenderer';
import {
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  Eye,
  Sparkles,
  Download,
  Share2,
} from 'lucide-react';

interface InvoiceLivePreviewProps {
  formData?: InvoiceFormData;
  data?: InvoiceFormData;
  calculations: InvoiceCalculations;
  onSelectTemplate?: (templateId: InvoiceTemplateId) => void;
  onOpenTemplateSelector?: () => void;
  onSaveAndGenerate?: () => void;
}

export const InvoiceLivePreview: React.FC<InvoiceLivePreviewProps> = ({
  formData,
  data,
  calculations,
  onSelectTemplate,
  onOpenTemplateSelector,
  onSaveAndGenerate,
}) => {
  const invoiceData: InvoiceFormData = formData || data || INVOICE_TEMPLATES[0] && {
    business: {
      name: 'ACME INDUSTRIES PVT LTD',
      tradeName: 'ACME Precision Engineering',
      gstin: '27AABCA1234F1Z5',
      pan: 'AABCA1234F',
      address: 'Plot 42, MIDC Industrial Area, Phase II, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra (27)',
      pincode: '400093',
      email: 'billing@acmeind.in',
      phone: '+91 22 2839 4000',
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      branch: 'Andheri East Branch, Mumbai',
      upiId: 'acme@hdfcbank',
    },
    customer: {
      id: 'cust_1',
      name: 'Quantum Dynamics Ltd',
      tradeName: 'Quantum Labs',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      billingAddress: 'Tower 4, Electronic City, Phase 1',
      shippingAddress: 'Tower 4, Electronic City, Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka (29)',
      pincode: '560100',
      email: 'ap@quantumdynamics.io',
      phone: '+91 80 4123 4567',
      placeOfSupply: 'Karnataka (29)',
    },
    metadata: {
      invoiceNumber: 'INV/2026/0892',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      poNumber: 'PO-2026-9041',
      paymentTerms: 'Net 30 Days',
      reverseCharge: false,
      isInterstate: true,
    },
    items: [],
    notes: 'Thank you for your business!',
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.',
    templateId: 'classic',
  };

  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const activeTemplateMeta =
    INVOICE_TEMPLATES.find((t) => t.id === invoiceData.templateId) ||
    INVOICE_TEMPLATES[0];

  const handlePrint = () => {
    window.print();
  };

  const handleTemplateChange = (tplId: InvoiceTemplateId) => {
    if (onSelectTemplate) {
      onSelectTemplate(tplId);
    } else if (onOpenTemplateSelector) {
      onOpenTemplateSelector();
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0 bg-neutral-100 border border-neutral-200 rounded-xs overflow-hidden shadow-2xs">
      {/* Top Preview Control Bar */}
      <div className="bg-white border-b border-neutral-200 p-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        {/* Active Template Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 max-w-full">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 mr-1 hidden sm:inline">
            Template:
          </span>
          {INVOICE_TEMPLATES.map((tpl) => {
            const isActive = invoiceData.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleTemplateChange(tpl.id)}
                id={`preview-pill-${tpl.id}`}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-xs transition-all flex items-center gap-1 whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-900 text-white font-bold shadow-xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-950'
                }`}
              >
                {isActive && <Check size={11} strokeWidth={3} className="text-emerald-400" />}
                <span>{tpl.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Action Controls: Zoom, Print, Generate */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-neutral-100 p-0.5 rounded-xs border border-neutral-200 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(75, prev - 10))}
              className="p-1 hover:bg-white rounded-2xs text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={12} />
            </button>
            <span className="px-1 text-neutral-700 min-w-[36px] text-center font-medium">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(125, prev + 10))}
              className="p-1 hover:bg-white rounded-2xs text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Print / PDF button */}
          <button
            type="button"
            onClick={handlePrint}
            id="print-invoice-btn"
            className="px-2.5 py-1 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-800 text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Print or Save as PDF"
          >
            <Printer size={13} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Template Status Bar */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-neutral-500 print:hidden">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-neutral-700 font-medium">
            {activeTemplateMeta.number} ({activeTemplateMeta.name})
          </span>
          <span className="text-neutral-400">â€¢ {activeTemplateMeta.badge}</span>
        </div>
        <div className="text-neutral-600">
          Grand Total: <strong className="text-neutral-900 font-sans">{(calculations?.grandTotal || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong>
        </div>
      </div>

      {/* Render Canvas Container */}
      <div className="invoice-workspace flex-1 min-w-0 p-4 sm:p-6 flex justify-start items-start print:p-0 print:overflow-visible">
        <div
          style={{
            zoom: zoomLevel / 100,
            
            transition: 'zoom 0.15s ease-out',
          }}
          className="invoice-document-shell shrink-0"
          id="printable-invoice-container"
        >
          <InvoiceRenderer data={invoiceData} calculations={calculations} />
        </div>
      </div>
    </div>
  );
};

