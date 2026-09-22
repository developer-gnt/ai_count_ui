import React from 'react';
import { InvoiceFormData, InvoiceCalculations } from '../types';
import { formatINR, formatDate } from '../../../utils/formatters';
import { QrCode, CheckCircle2, Shield, ArrowUpRight } from 'lucide-react';

interface TemplateProps {
  data: InvoiceFormData;
  calculations: InvoiceCalculations;
}

export const ModernTemplate: React.FC<TemplateProps> = ({ data, calculations }) => {
  const { business, customer, metadata, items } = data;
  const isInterstate = metadata.isInterstate;

  return (
    <div className="invoice-document bg-white text-neutral-900 text-[11px] leading-relaxed p-6 sm:p-9 font-sans shadow-md border border-neutral-200 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none min-h-[980px] flex flex-col justify-between rounded-xs">
      <div>
        {/* Modern Charcoal Header Bar */}
        <div className="bg-neutral-950 text-white p-6 rounded-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-neutral-950 font-mono font-bold text-base flex items-center justify-center rounded-xs shadow-xs">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight uppercase">
                  {business.name || 'ACME INDUSTRIES PVT LTD'}
                </h1>
              </div>
              <p className="text-neutral-400 text-xs font-mono">
                GSTIN: <span className="text-neutral-200">{business.gstin}</span> â€¢ PAN: {business.pan}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-mono rounded-full mb-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              TAX INVOICE
            </div>
            <div className="font-mono text-xs text-neutral-400">
              #{metadata.invoiceNumber}
            </div>
          </div>
        </div>

        {/* 3-Column Metadata Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-50 border border-neutral-200/80 rounded-xs mb-6 text-xs font-mono">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block">Invoice Date</span>
            <strong className="text-neutral-900 text-xs">{formatDate(metadata.invoiceDate)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block">Due Date</span>
            <strong className="text-neutral-900 text-xs">{formatDate(metadata.dueDate)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block">PO Number</span>
            <span className="text-neutral-800 text-xs">{metadata.poNumber || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block">Payment Terms</span>
            <span className="text-neutral-800 text-xs">{metadata.paymentTerms || 'Net 30 Days'}</span>
          </div>
        </div>

        {/* Dual Cards: Billed From vs Billed To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Billed From */}
          <div className="p-4 border border-neutral-200 rounded-xs bg-white">
            <div className="text-[10px] font-bold font-mono uppercase text-neutral-400 mb-2 flex items-center justify-between">
              <span>Billed From</span>
              <span className="text-neutral-500">{business.city}</span>
            </div>
            <div className="font-bold text-neutral-950 text-sm mb-1">{business.name}</div>
            <div className="text-neutral-600 text-[11px] space-y-0.5">
              <p>{business.address}</p>
              <p>{business.city}, {business.state} - {business.pincode}</p>
              <p className="font-mono text-[10.5px] pt-1">
                Email: {business.email} â€¢ Ph: {business.phone}
              </p>
            </div>
          </div>

          {/* Billed To */}
          <div className="p-4 border border-neutral-200 rounded-xs bg-neutral-50/50">
            <div className="text-[10px] font-bold font-mono uppercase text-neutral-400 mb-2 flex items-center justify-between">
              <span>Billed To (Client)</span>
              <span className="text-emerald-700 font-mono text-[9.5px] bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
                Place of Supply: {customer.placeOfSupply || customer.state}
              </span>
            </div>
            <div className="font-bold text-neutral-950 text-sm mb-1">{customer.name}</div>
            <div className="text-neutral-600 text-[11px] space-y-0.5">
              <p>{customer.billingAddress}</p>
              <p>{customer.city}, {customer.state} {customer.pincode ? `- ${customer.pincode}` : ''}</p>
              <p className="font-mono text-[10.5px] pt-1 font-semibold text-neutral-900">
                GSTIN: {customer.gstin || 'UNREGISTERED'} {customer.pan ? `â€¢ PAN: ${customer.pan}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Modern Items Table */}
        <div className="mb-6 overflow-hidden rounded-xs border border-neutral-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600 font-mono text-[10px] uppercase border-b border-neutral-200">
                <th className="p-3 text-left w-8">#</th>
                <th className="p-3 text-left">Item Description</th>
                <th className="p-3 text-center w-20">HSN/SAC</th>
                <th className="p-3 text-right w-14">Qty</th>
                <th className="p-3 text-right w-24">Rate</th>
                <th className="p-3 text-right w-16">Disc %</th>
                <th className="p-3 text-right w-20">Tax %</th>
                <th className="p-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
              {items.map((item, idx) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const disc = Number(item.discountPct) || 0;
                const gst = Number(item.gstRate) || 0;
                const taxable = qty * rate * (1 - disc / 100);
                const taxAmt = (taxable * gst) / 100;
                const lineTotal = taxable + taxAmt;

                return (
                  <tr key={item.id || idx} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3 text-neutral-400 text-left">{idx + 1}</td>
                    <td className="p-3 font-sans text-neutral-900 font-medium">
                      <div>{item.description || 'Untitled Item'}</div>
                    </td>
                    <td className="p-3 text-center text-neutral-500">{item.hsn || '-'}</td>
                    <td className="p-3 text-right font-bold text-neutral-900">
                      {qty} <span className="text-[10px] font-normal text-neutral-500">{item.unit}</span>
                    </td>
                    <td className="p-3 text-right text-neutral-700">{formatINR(rate, false)}</td>
                    <td className="p-3 text-right text-neutral-500">{disc > 0 ? `${disc}%` : '-'}</td>
                    <td className="p-3 text-right text-neutral-600">{gst}%</td>
                    <td className="p-3 text-right font-bold text-neutral-950">{formatINR(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Block: Bank Info + Modern Calculation Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          {/* Left Column: Bank & Remittance */}
          <div className="md:col-span-6 space-y-4">
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xs">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                <Shield size={12} className="text-neutral-700" />
                <span>Verified Remittance Instructions</span>
              </div>
              <div className="text-[11px] font-mono space-y-1 text-neutral-700">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bank Name:</span>
                  <strong className="text-neutral-900">{business.bankName || 'HDFC Bank Ltd'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Account Number:</span>
                  <strong className="text-neutral-900">{business.accountNumber || '50200012345678'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IFSC Code:</span>
                  <strong className="text-neutral-900">{business.ifscCode || 'HDFC0000060'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Branch:</span>
                  <span>{business.branch || 'MIDC Andheri East'}</span>
                </div>
                {business.upiId && (
                  <div className="flex justify-between pt-1 border-t border-neutral-200/80">
                    <span className="text-neutral-500">UPI VPA:</span>
                    <span className="text-neutral-900 font-semibold">{business.upiId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount In Words Banner */}
            <div className="p-3 bg-neutral-100 rounded-xs text-[10.5px]">
              <span className="font-mono text-[9.5px] uppercase font-bold text-neutral-500 block mb-0.5">
                Amount in Words
              </span>
              <span className="font-serif italic font-semibold text-neutral-900">
                INR {calculations.amountInWords}
              </span>
            </div>
          </div>

          {/* Right Column: High-Contrast Math & Total Box */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div className="space-y-1.5 font-mono text-xs px-2">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatINR(calculations.subtotal)}</span>
              </div>
              {calculations.itemDiscounts > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Line Item Discounts</span>
                  <span>- {formatINR(calculations.itemDiscounts)}</span>
                </div>
              )}
              {calculations.additionalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount</span>
                  <span>- {formatINR(calculations.additionalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                <span>Taxable Amount</span>
                <span>{formatINR(calculations.taxableAmount)}</span>
              </div>

              {!isInterstate ? (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <span>Central GST (CGST)</span>
                    <span>{formatINR(calculations.totalCgst)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>State GST (SGST)</span>
                    <span>{formatINR(calculations.totalSgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-neutral-600">
                  <span>Integrated GST (IGST)</span>
                  <span>{formatINR(calculations.totalIgst)}</span>
                </div>
              )}

              {calculations.shippingCharges > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping & Handling</span>
                  <span>{formatINR(calculations.shippingCharges)}</span>
                </div>
              )}
            </div>

            {/* Modern Total Highlight Box */}
            <div className="mt-4 p-4 bg-neutral-900 text-white rounded-xs flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                  Total Due
                </span>
                <span className="text-xs text-neutral-300 font-mono">Net Payable INR</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatINR(calculations.grandTotal)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Footer */}
      <div className="border-t border-neutral-200 pt-4 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-end text-xs">
        <div>
          <span className="text-[9.5px] font-mono font-bold uppercase text-neutral-500 block mb-1">
            Terms & Commercial Notes
          </span>
          <p className="text-[10px] text-neutral-600 whitespace-pre-line leading-relaxed">
            {data.termsAndConditions}
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] text-neutral-400 font-mono uppercase">
            Digitally Authenticated for
          </div>
          <div className="font-bold text-neutral-900 text-xs uppercase mb-4">
            {business.name}
          </div>
          <div className="border-t border-neutral-300 pt-1 w-44 text-center">
            <div className="font-semibold text-neutral-900 text-xs font-mono">{data.authorizedSignatory || ''}</div>
            <div className="text-[9px] text-neutral-500">{data.signatoryTitle || 'Authorized Signatory'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};


