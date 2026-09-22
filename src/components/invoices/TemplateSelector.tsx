import React, { useState, useRef } from 'react';
import { InvoiceTemplateId, InvoiceFormData, InvoiceItemForm } from './types';
import { INVOICE_TEMPLATES } from './mockInvoiceData';
import {
  Check,
  Sparkles,
  Camera,
  Upload,
  FileText,
  Scan,
  Layers,
  ArrowRight,
  ShieldCheck,
  Palette,
  Eye,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId: InvoiceTemplateId;
  onSelectTemplate: (templateId: InvoiceTemplateId, customData?: Partial<InvoiceFormData>) => void;
  onClose?: () => void;
  isInitialStep?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  onClose,
  isInitialStep = false,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'custom'>('scan');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom template customization state
  const [customBrandColor, setCustomBrandColor] = useState<string>('#0f172a');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');

  // Sample mock OCR datasets for instant 1-click test scanning
  const sampleScans: { label: string; tag: string; data: Partial<InvoiceFormData> }[] = [
    {
      label: 'Apex Industrial Hardware Bill (B2B Tax Invoice)',
      tag: 'Manufacturing & Hardware',
      data: {
        customer: {
          id: 'cust_apex_scanned',
          name: 'Apex Industrial Hardware Ltd',
          tradeName: 'Apex Tools & Machining',
          gstin: '27AABCA5566G1Z2',
          pan: 'AABCA5566G',
          billingAddress: 'Gala 14, Phase 2, TTC Industrial Area',
          shippingAddress: 'Gala 14, Phase 2, TTC Industrial Area',
          city: 'Navi Mumbai',
          state: 'Maharashtra (27)',
          pincode: '400705',
          email: 'accounts@apextools.in',
          phone: '+91 22 2778 9900',
          placeOfSupply: 'Maharashtra (27)',
        },
        metadata: {
          invoiceNumber: 'INV/2026/SCN-882',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          poNumber: 'PO-APX-4491',
          paymentTerms: 'Net 30 Days',
          reverseCharge: false,
          isInterstate: false,
        },
        items: [
          {
            id: 'scn_1',
            description: 'High-Tensile Industrial Hex Bolts M12 x 50mm (Grade 8.8)',
            hsn: '7318',
            quantity: 500,
            unit: 'PCS',
            rate: 28,
            discountPct: 5,
            gstRate: 18,
            amount: 13300,
            cgst: 1197,
            sgst: 1197,
            igst: 0,
            total: 15694,
          },
          {
            id: 'scn_2',
            description: 'Precision CNC Machined Flange Adapters (SS304)',
            hsn: '8481',
            quantity: 20,
            unit: 'NOS',
            rate: 1850,
            discountPct: 0,
            gstRate: 18,
            amount: 37000,
            cgst: 3330,
            sgst: 3330,
            igst: 0,
            total: 43660,
          },
        ],
        notes: 'Scanned via AI OCR from Physical Vendor Challan.',
      },
    },
    {
      label: 'Nova Cloud Systems (SaaS & IT Retainer)',
      tag: 'IT & Software Consulting',
      data: {
        customer: {
          id: 'cust_nova_scanned',
          name: 'Nova Cloud Technologies Pte',
          tradeName: 'Nova DevOps Systems',
          gstin: '29AABCN9901M1Z5',
          pan: 'AABCN9901M',
          billingAddress: 'Tower 3, Global Tech Village, Outer Ring Road',
          shippingAddress: 'Tower 3, Global Tech Village, Outer Ring Road',
          city: 'Bengaluru',
          state: 'Karnataka (29)',
          pincode: '560103',
          email: 'billing@novacloud.io',
          phone: '+91 80 4123 7700',
          placeOfSupply: 'Karnataka (29)',
        },
        metadata: {
          invoiceNumber: 'INV/2026/SCN-914',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          poNumber: 'PO-NOVA-2026-Q2',
          paymentTerms: 'Net 15 Days',
          reverseCharge: false,
          isInterstate: true,
        },
        items: [
          {
            id: 'scn_3',
            description: 'Enterprise Cloud Architecture & Kubernetes Infrastructure Advisory (Monthly Retainer)',
            hsn: '998313',
            quantity: 1,
            unit: 'MONTH',
            rate: 125000,
            discountPct: 0,
            gstRate: 18,
            amount: 125000,
            cgst: 0,
            sgst: 0,
            igst: 22500,
            total: 147500,
          },
          {
            id: 'scn_4',
            description: '24/7 Production DevOps Incident Response Support SLA',
            hsn: '998314',
            quantity: 1,
            unit: 'MONTH',
            rate: 35000,
            discountPct: 0,
            gstRate: 18,
            amount: 35000,
            cgst: 0,
            sgst: 0,
            igst: 6300,
            total: 41300,
          },
        ],
        notes: 'Interstate export of service supply to Bengaluru development center.',
      },
    },
  ];

  const handleSimulateScan = (scanData: Partial<InvoiceFormData>, label: string) => {
    setIsScanning(true);
    setScanSuccess(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(`Successfully parsed ${label}! Auto-filling invoice fields...`);
      setTimeout(() => {
        onSelectTemplate(selectedTemplateId || 'classic', scanData);
      }, 700);
    }, 1100);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanSuccess(null);

    // Simulate OCR parsing from uploaded file
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(`Scanned "${file.name}"! Table coordinates & GST data parsed.`);
      setTimeout(() => {
        onSelectTemplate(selectedTemplateId || 'classic', sampleScans[0].data);
      }, 800);
    }, 1400);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Title & Subtitle Header */}
      <div className="text-center md:text-left border-b border-neutral-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 font-sans">
              Choose an invoice design
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-2xl">
              Select one of the 4 GST-compliant invoice layouts below, or scan an existing physical / PDF bill to auto-populate line items and customer information.
            </p>
          </div>

          {onClose && !isInitialStep && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-xs text-xs font-mono font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* 4 TEMPLATES GRID (T1, T2, T3, T4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {INVOICE_TEMPLATES.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;

          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl.id)}
              id={`template-card-${tpl.id}`}
              className={`group relative text-left rounded-xs p-4 cursor-pointer transition-all duration-200 border flex flex-col justify-between ${
                isSelected
                  ? 'border-neutral-950 bg-neutral-50/80 ring-2 ring-neutral-950 shadow-md'
                  : 'border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm'
              }`}
            >
              <div>
                {/* Header: Number Badge & Tag */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-mono font-black uppercase px-2 py-0.5 bg-neutral-900 text-white rounded-xs tracking-wider">
                    {tpl.number}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-xs font-medium ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {tpl.badge}
                  </span>
                </div>

                {/* Title & Tagline */}
                <h3 className="font-bold text-sm text-neutral-950 group-hover:text-neutral-900 flex items-center justify-between">
                  <span>{tpl.name}</span>
                  {isSelected && (
                    <span className="text-emerald-700 font-mono text-[11px] font-bold flex items-center gap-0.5">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </h3>
                <div className="text-[11px] text-neutral-500 font-medium mt-0.5 mb-3">
                  {tpl.tagline}
                </div>

                {/* Visual Thumbnail Wireframe Preview */}
                <div className="border border-neutral-200 rounded-xs p-2 bg-white mb-3 h-32 flex flex-col justify-between overflow-hidden shadow-2xs group-hover:border-neutral-300 transition-colors">
                  {tpl.id === 'classic' && (
                    <div className="space-y-1.5 opacity-90 h-full flex flex-col justify-between text-[7px] font-mono">
                      <div className="h-3 bg-neutral-200 border border-neutral-400 rounded-2xs text-center font-bold uppercase flex items-center justify-center text-neutral-800">
                        TAX INVOICE
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-7 bg-neutral-50 border border-neutral-300 rounded-2xs p-1">
                          <div className="w-8 h-1 bg-neutral-600 mb-0.5"></div>
                          <div className="w-12 h-1 bg-neutral-400"></div>
                        </div>
                        <div className="h-7 bg-neutral-50 border border-neutral-300 rounded-2xs p-1">
                          <div className="w-7 h-1 bg-neutral-600 mb-0.5"></div>
                          <div className="w-10 h-1 bg-neutral-400"></div>
                        </div>
                      </div>
                      <div className="h-8 bg-white border border-neutral-300 rounded-2xs divide-y divide-neutral-200 flex flex-col justify-between">
                        <div className="h-2.5 bg-neutral-100 flex items-center px-1 justify-between">
                          <span className="w-8 h-1 bg-neutral-500"></span>
                          <span className="w-4 h-1 bg-neutral-500"></span>
                        </div>
                        <div className="h-2.5 flex items-center px-1 justify-between">
                          <span className="w-10 h-1 bg-neutral-300"></span>
                          <span className="w-4 h-1 bg-neutral-400"></span>
                        </div>
                      </div>
                      <div className="w-12 h-2 bg-neutral-900 rounded-2xs self-end"></div>
                    </div>
                  )}

                  {tpl.id === 'modern' && (
                    <div className="space-y-1.5 opacity-90 h-full flex flex-col justify-between">
                      <div className="h-5 bg-neutral-900 rounded-2xs p-1 flex items-center justify-between text-white">
                        <div className="w-8 h-1.5 bg-white/90 rounded-2xs"></div>
                        <div className="w-10 h-1.5 bg-emerald-400 rounded-2xs"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-6 bg-neutral-50 border border-neutral-200 rounded-2xs p-0.5">
                          <div className="w-8 h-1 bg-neutral-400"></div>
                        </div>
                        <div className="h-6 bg-neutral-50 border border-neutral-200 rounded-2xs p-0.5">
                          <div className="w-6 h-1 bg-neutral-400"></div>
                        </div>
                      </div>
                      <div className="h-8 bg-white border border-neutral-200 rounded-2xs p-1 flex flex-col justify-between">
                        <div className="w-full h-1.5 bg-neutral-100"></div>
                        <div className="w-3/4 h-1.5 bg-neutral-100"></div>
                        <div className="w-1/3 h-2 bg-neutral-900 rounded-2xs self-end"></div>
                      </div>
                    </div>
                  )}

                  {tpl.id === 'minimal' && (
                    <div className="space-y-1.5 opacity-90 h-full flex flex-col justify-between">
                      <div className="h-4 border-b border-neutral-900 flex justify-between items-center px-0.5">
                        <div className="w-12 h-2 bg-neutral-900"></div>
                        <div className="w-6 h-1.5 bg-neutral-400"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 py-1 border-b border-neutral-200">
                        <div className="h-4 bg-neutral-100"></div>
                        <div className="h-4 bg-neutral-100"></div>
                        <div className="h-4 bg-neutral-100"></div>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        <div className="h-1 bg-neutral-300"></div>
                        <div className="h-1 bg-neutral-200"></div>
                        <div className="h-2 w-14 bg-neutral-900 ml-auto"></div>
                      </div>
                    </div>
                  )}

                  {tpl.id === 'corporate' && (
                    <div className="space-y-1 opacity-90 h-full flex flex-col justify-between">
                      <div className="h-1 bg-neutral-950"></div>
                      <div className="h-5 border-b border-neutral-300 flex justify-between items-center px-1">
                        <div className="w-12 h-2 bg-neutral-800"></div>
                        <div className="w-8 h-2.5 bg-neutral-200 rounded-2xs"></div>
                      </div>
                      <div className="h-2.5 bg-neutral-900 rounded-2xs"></div>
                      <div className="h-8 border border-neutral-300 rounded-2xs p-0.5 space-y-0.5">
                        <div className="h-1.5 bg-neutral-200"></div>
                        <div className="h-1.5 bg-white"></div>
                        <div className="h-1.5 bg-white"></div>
                      </div>
                      <div className="h-2 w-16 bg-neutral-900 rounded-2xs self-end"></div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-600 line-clamp-2 mb-2 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-500 font-sans truncate max-w-[130px]">
                  {tpl.recommendedFor.split(',')[0]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(tpl.id);
                  }}
                  className={`px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-neutral-950 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <span>{isSelected ? 'Using T' + tpl.number.replace(/\D/g, '') : 'Select'}</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PROMINENT BOTTOM CARD: 📷 Scan your invoice / Use custom template */}
      <div
        id="scan-custom-template-banner"
        className="rounded-xs border-2 border-dashed border-neutral-300 bg-neutral-50/70 p-5 sm:p-6 transition-all hover:border-neutral-400 hover:bg-neutral-50 shadow-2xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xs bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-950 font-sans">
                  📷 Scan your invoice / Use custom template
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-full">
                  AI OCR Scanner
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5 max-w-xl">
                Have a paper bill, vendor PDF, or purchase order? Scan or upload it to automatically extract customer details, HSN codes, and line item taxes into the editor.
              </p>
            </div>
          </div>

          {/* Sub Tab Switcher (Scan OCR vs Custom Template) */}
          <div className="flex items-center bg-white p-1 rounded-xs border border-neutral-200 self-start lg:self-center font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1 rounded-2xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'scan'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Scan size={13} />
              <span>Scan Bill (OCR)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 rounded-2xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'custom'
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Palette size={13} />
              <span>Custom Layout</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Invoice Scanner Dropzone & Demo Bills */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {/* Upload Area */}
            <div className="bg-white border border-neutral-200 rounded-xs p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 shrink-0">
                  <Upload size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">
                    Upload physical bill photo or PDF document
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    Supported: PDF, PNG, JPG, JPEG (Max 10MB)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  id="browse-invoice-file-btn"
                  className="w-full sm:w-auto px-4 py-2 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 rounded-xs text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <FileText size={14} />
                  <span>Choose File to Scan</span>
                </button>
              </div>
            </div>

            {/* Scanning Status Alert */}
            {isScanning && (
              <div className="p-3 bg-neutral-900 text-white rounded-xs text-xs font-mono flex items-center gap-2 animate-pulse">
                <RefreshCw size={14} className="animate-spin text-emerald-400" />
                <span>Scanning document geometry... Performing GST & HSN line item extraction...</span>
              </div>
            )}

            {scanSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xs text-xs font-mono flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700" />
                <span>{scanSuccess}</span>
              </div>
            )}

            {/* Quick Demo Pre-scanned Bills for 1-Click Testing */}
            <div className="pt-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                <Zap size={13} className="text-amber-600" />
                <span>Try instant 1-click test scans (Sample Invoices):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {sampleScans.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSimulateScan(sample.data, sample.label)}
                    disabled={isScanning}
                    className="text-left p-3 bg-white hover:bg-neutral-100 border border-neutral-300 hover:border-neutral-900 rounded-xs transition-all flex items-center justify-between group shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-neutral-900 group-hover:text-neutral-950">
                        {sample.label}
                      </div>
                      <div className="text-[10.5px] text-neutral-500 font-mono mt-0.5">
                        Category: {sample.tag} • Items: {sample.data.items?.length || 2}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-neutral-700 group-hover:text-neutral-950 flex items-center gap-1">
                      <span>Scan Bill</span>
                      <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Custom Layout & Brand Presets */}
        {activeTab === 'custom' && (
          <div className="bg-white border border-neutral-200 rounded-xs p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Brand Primary Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customBrandColor}
                    onChange={(e) => setCustomBrandColor(e.target.value)}
                    className="w-8 h-8 rounded-xs cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customBrandColor}
                    onChange={(e) => setCustomBrandColor(e.target.value)}
                    className="w-24 px-2 py-1 border border-neutral-300 rounded-xs font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Custom Logo URL / Watermark
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png (Optional)"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-xs text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
              <span className="text-xs text-neutral-500 font-mono">
                Applies custom corporate palette across templates T1-T4.
              </span>
              <button
                type="button"
                onClick={() => onSelectTemplate(selectedTemplateId || 'classic')}
                className="px-4 py-1.5 bg-neutral-950 hover:bg-neutral-900 text-white rounded-xs font-mono text-xs font-semibold flex items-center gap-1.5"
              >
                <span>Apply & Open Editor</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
