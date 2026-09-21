import React from 'react';
import { InvoiceFormData, InvoiceCalculations } from '../types';
import { formatINR, formatDate } from '../../../utils/formatters';

interface TemplateProps {
  data: InvoiceFormData;
  calculations: InvoiceCalculations;
}

export const MinimalTemplate: React.FC<TemplateProps> = ({ data, calculations }) => {
  const { business, customer, metadata, items } = data;
  const isInterstate = metadata.isInterstate;

  return (
    <div className="invoice-document bg-white text-neutral-900 text-[11px] leading-relaxed p-6 sm:p-10 font-sans max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none min-h-[980px] flex flex-col justify-between">
      <div>
        {/* Minimal Swiss Top Navigation Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline border-b border-neutral-900 pb-4 mb-8">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 block mb-1">
              INVOICE / TAX MEMORANDUM
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 uppercase font-sans">
              {business.name || 'ACME INDUSTRIES PVT LTD'}
            </h1>
          </div>
          <div className="text-left sm:text-right mt-2 sm:mt-0 font-mono">
            <div className="text-lg font-bold text-neutral-950">#{metadata.invoiceNumber}</div>
            <div className="text-[10px] text-neutral-500">GSTIN: {business.gstin}</div>
          </div>
        </div>

        {/* Minimal Grid: Issuer, Client & Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-neutral-200 mb-8 text-xs">
          {/* Col 1: Origin */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
              From / Origin
            </div>
            <div className="font-semibold text-neutral-900 mb-0.5">{business.name}</div>
            <div className="text-neutral-600 text-[11px] leading-snug space-y-0.5">
              <p>{business.address}</p>
              <p>{business.city}, {business.state} {business.pincode}</p>
              <p className="font-mono text-[10px] pt-1 text-neutral-500">
                PAN: {business.pan}
              </p>
            </div>
          </div>

          {/* Col 2: Recipient */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
              To / Recipient
            </div>
            <div className="font-semibold text-neutral-900 mb-0.5">{customer.name}</div>
            <div className="text-neutral-600 text-[11px] leading-snug space-y-0.5">
              <p>{customer.billingAddress}</p>
              <p>{customer.city}, {customer.state} {customer.pincode}</p>
              <p className="font-mono text-[10px] pt-1 font-semibold text-neutral-900">
                GSTIN: {customer.gstin || 'UNREGISTERED'}
              </p>
            </div>
          </div>

          {/* Col 3: Invoice Dates & Meta */}
          <div className="font-mono text-xs space-y-2 bg-neutral-50/70 p-3 rounded-xs border border-neutral-100">
            <div className="flex justify-between">
              <span className="text-neutral-400 text-[10px] uppercase">Issued</span>
              <span className="text-neutral-900 font-medium">{formatDate(metadata.invoiceDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 text-[10px] uppercase">Due Date</span>
              <span className="text-neutral-900 font-medium">{formatDate(metadata.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400 text-[10px] uppercase">Terms</span>
              <span className="text-neutral-900">{metadata.paymentTerms || 'Net 30'}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200/80 pt-1">
              <span className="text-neutral-400 text-[10px] uppercase">Supply</span>
              <span className="text-neutral-900 truncate max-w-[120px]">{customer.placeOfSupply || customer.state}</span>
            </div>
          </div>
        </div>

        {/* Minimal Items Table */}
        <div className="mb-8">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-neutral-900 text-[10px] font-mono uppercase text-neutral-500">
                <th className="py-2 text-left font-normal w-8">#</th>
                <th className="py-2 text-left font-normal">Description</th>
                <th className="py-2 text-center font-normal w-16">HSN</th>
                <th className="py-2 text-right font-normal w-14">Qty</th>
                <th className="py-2 text-right font-normal w-24">Rate</th>
                <th className="py-2 text-right font-normal w-14">Disc</th>
                <th className="py-2 text-right font-normal w-16">GST</th>
                <th className="py-2 text-right font-normal w-28">Amount</th>
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
                  <tr key={item.id || idx}>
                    <td className="py-3 text-neutral-400 text-left">{idx + 1}</td>
                    <td className="py-3 font-sans text-neutral-900 font-medium">
                      {item.description || 'Untitled Item'}
                    </td>
                    <td className="py-3 text-center text-neutral-500">{item.hsn || '-'}</td>
                    <td className="py-3 text-right font-semibold text-neutral-900">
                      {qty} <span className="text-[9px] font-normal text-neutral-400">{item.unit}</span>
                    </td>
                    <td className="py-3 text-right text-neutral-700">{formatINR(rate, false)}</td>
                    <td className="py-3 text-right text-neutral-500">{disc > 0 ? `${disc}%` : '-'}</td>
                    <td className="py-3 text-right text-neutral-600">{gst}%</td>
                    <td className="py-3 text-right font-semibold text-neutral-950">{formatINR(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Minimal Swiss Totals Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-neutral-900 mb-8">
          {/* Left: Payment info in simple mono list */}
          <div className="font-mono text-[10.5px] space-y-1 text-neutral-600">
            <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">
              Remittance Details
            </div>
            <div>Bank: <strong className="text-neutral-900">{business.bankName || 'HDFC Bank Ltd'}</strong></div>
            <div>Account: <strong className="text-neutral-900">{business.accountNumber}</strong></div>
            <div>IFSC: <strong className="text-neutral-900">{business.ifscCode}</strong></div>
            {business.upiId && <div>UPI: <span className="text-neutral-900">{business.upiId}</span></div>}
          </div>

          {/* Right: Calculated Summary */}
          <div className="font-mono text-xs space-y-1.5 text-right">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{formatINR(calculations.subtotal)}</span>
            </div>
            {calculations.itemDiscounts > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Discounts</span>
                <span>- {formatINR(calculations.itemDiscounts)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-neutral-900 pt-1 border-t border-neutral-200">
              <span>Taxable Value</span>
              <span>{formatINR(calculations.taxableAmount)}</span>
            </div>
            {!isInterstate ? (
              <>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>CGST</span>
                  <span>{formatINR(calculations.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>SGST</span>
                  <span>{formatINR(calculations.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-neutral-500 text-[11px]">
                <span>IGST</span>
                <span>{formatINR(calculations.totalIgst)}</span>
              </div>
            )}
            {calculations.shippingCharges > 0 && (
              <div className="flex justify-between text-neutral-500 text-[11px]">
                <span>Shipping</span>
                <span>{formatINR(calculations.shippingCharges)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t-2 border-neutral-900 font-bold text-neutral-950">
              <span className="text-sm uppercase tracking-tight">Total Amount</span>
              <span className="text-xl">{formatINR(calculations.grandTotal)}</span>
            </div>
            <div className="text-[10px] text-neutral-500 italic font-serif pt-1">
              INR {calculations.amountInWords}
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="border-t border-neutral-200 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end text-[10px] text-neutral-500 font-mono gap-4">
        <div className="max-w-md">
          <span className="text-neutral-400 uppercase tracking-widest text-[9px] block mb-1">Standard Terms</span>
          <p className="line-clamp-2">{data.termsAndConditions}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-sans font-bold text-neutral-900 text-xs uppercase">{business.name}</div>
          <div>Authorized Signatory: {data.authorizedSignatory || ''}</div>
        </div>
      </div>
    </div>
  );
};

