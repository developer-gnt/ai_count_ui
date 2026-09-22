import React, { useState, useEffect, useRef } from 'react';
import { InvoiceFormData, InvoiceCalculations, InvoiceTemplateId } from './types';
import { INVOICE_TEMPLATES } from './mockInvoiceData';
import { InvoiceRenderer } from './templates/InvoiceRenderer';
import { formatINR } from '../../utils/formatters';
import {
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  Eye,
  ArrowLeft,
  Save,
  CheckCircle2,
  Loader2,
  FileCheck,
  Sparkles,
} from 'lucide-react';

interface InvoiceLivePreviewProps {
  formData: InvoiceFormData;
  calculations: InvoiceCalculations;
  onSelectTemplate: (templateId: InvoiceTemplateId) => void;
  onBackToEdit: () => void;
  onSaveDraft: () => Promise<void> | void;
  onFinalize?: () => Promise<void> | void;
  isSaving?: boolean;
  isFinalizing?: boolean;
}

export const InvoiceLivePreview: React.FC<InvoiceLivePreviewProps> = ({
  formData,
  calculations,
  onSelectTemplate,
  onBackToEdit,
  onSaveDraft,
  onFinalize,
  isSaving = false,
  isFinalizing = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFitToPage, setIsFitToPage] = useState<boolean>(true);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const documentShellRef = useRef<HTMLDivElement>(null);

  const activeTemplateMeta =
    INVOICE_TEMPLATES.find((t) => t.id === formData.templateId) ||
    INVOICE_TEMPLATES[0];

  // Calculate fit-to-page scale factor dynamically
  useEffect(() => {
    if (!isFitToPage) return;

    const computeFitScale = () => {
      if (previewContainerRef.current) {
        const containerHeight = previewContainerRef.current.clientHeight - 48; // padding allowance
        const containerWidth = previewContainerRef.current.clientWidth - 48;
        const targetA4Height = 1050; // standard rendered A4 height baseline
        const targetA4Width = 840;

        const scaleH = containerHeight / targetA4Height;
        const scaleW = containerWidth / targetA4Width;
        const bestScale = Math.min(scaleH, scaleW, 1.0); // max 100% on huge screens
        const clampedScale = Math.max(0.45, Math.min(1.0, bestScale));
        setZoomLevel(Math.round(clampedScale * 100));
      }
    };

    computeFitScale();
    window.addEventListener('resize', computeFitScale);
    return () => window.removeEventListener('resize', computeFitScale);
  }, [isFitToPage]);

  const handleManualZoomChange = (delta: number) => {
    setIsFitToPage(false);
    setZoomLevel((prev) => Math.max(50, Math.min(150, prev + delta)));
  };

  const handleResetZoom100 = () => {
    setIsFitToPage(false);
    setZoomLevel(100);
  };

  const handleToggleFitToPage = () => {
    setIsFitToPage(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100 font-sans">
      {/* Top Preview Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs print:hidden">
        {/* Left: Back to Editing */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToEdit}
            id="preview-back-to-edit-btn"
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-mono font-semibold rounded-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>← Back to Editing</span>
          </button>

          <div className="hidden sm:block">
            <span className="text-xs font-mono font-bold uppercase text-neutral-400">
              Invoice Preview
            </span>
            <span className="text-neutral-300 mx-2">•</span>
            <span className="text-xs font-semibold text-neutral-800 font-mono">
              {formData.metadata.invoiceNumber || 'DRAFT'} ({formatINR(calculations.grandTotal)})
            </span>
          </div>
        </div>

        {/* Center: Template Switcher Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xs border border-neutral-200">
          {INVOICE_TEMPLATES.map((tpl) => {
            const isActive = formData.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl.id)}
                id={`template-tab-${tpl.id}`}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-xs transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-white text-neutral-950 font-bold shadow-2xs border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                {isActive && <Check size={11} strokeWidth={3} className="text-emerald-600" />}
                <span>{tpl.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Zoom Controls + Save / Finalize */}
        <div className="flex items-center gap-2">
          {/* Zoom Tools */}
          <div className="flex items-center gap-0.5 bg-neutral-100 p-0.5 rounded-xs border border-neutral-200 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => handleManualZoomChange(-10)}
              className="p-1 hover:bg-white rounded-2xs text-neutral-700 hover:text-neutral-950"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom100}
              className={`px-1.5 py-0.5 rounded-2xs text-neutral-700 hover:bg-white ${
                zoomLevel === 100 && !isFitToPage ? 'font-bold bg-white text-neutral-950' : ''
              }`}
              title="Actual 100% size"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => handleManualZoomChange(10)}
              className="p-1 hover:bg-white rounded-2xs text-neutral-700 hover:text-neutral-950"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={handleToggleFitToPage}
              className={`px-2 py-0.5 rounded-2xs text-[10px] uppercase font-semibold flex items-center gap-1 ${
                isFitToPage
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:bg-white'
              }`}
              title="Scale to fit window"
            >
              <Maximize2 size={11} />
              <span>Fit Page</span>
            </button>
          </div>

          {/* Print / PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            id="print-invoice-btn"
            className="px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 text-xs font-mono font-medium rounded-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          {/* Finalize / Issue Button */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || isFinalizing}
            id="finalize-invoice-btn"
            className="px-4 py-1.5 bg-neutral-950 hover:bg-neutral-850 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {isSaving || isFinalizing ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FileCheck size={14} className="text-emerald-400" />
                <span>Finalize &amp; Save Draft</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main A4 Document Workspace (Centered, Non-Cropped, Responsive Scale) */}
      <main
        ref={previewContainerRef}
        className="flex-1 w-full min-h-[calc(100vh-60px)] p-4 sm:p-8 flex justify-center items-start overflow-y-auto print:p-0 print:overflow-visible print:bg-white"
      >
        <div
          ref={documentShellRef}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            marginBottom: `${Math.max(20, (1050 * (zoomLevel / 100)) - 800)}px`,
          }}
          className="shrink-0 w-full max-w-4xl bg-white shadow-lg border border-neutral-300 rounded-2xs print:shadow-none print:border-none print:transform-none print:m-0"
          id="printable-invoice-container"
        >
          <InvoiceRenderer data={formData} calculations={calculations} />
        </div>
      </main>
    </div>
  );
};
