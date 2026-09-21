import React from 'react';
import { InvoiceFormData, InvoiceCalculations } from '../types';
import { formatINR, formatDate } from '../../../utils/formatters';

interface TemplateProps {
  data: InvoiceFormData;
  calculations: InvoiceCalculations;
}

export const CompactTemplate: React.FC<TemplateProps> = ({ data, calculations }) => {
  const { business, customer, metadata, items } = data;
  const isInterstate = metadata.isInterstate;

  return (
    <div className="invoice-document bg-white text-neutral-900 text-[10px] leading-tight p-4 sm:p-6 font-mono border border-neutral-400 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none min-h-[960px] flex flex-col justify-between">
      <div>
        {/* Compact Top Header */}
        <div className="border-b border-neutral-900 pb-2 mb-2 flex justify-between items-start">
          <div>
            <div className="text-[8.5px] uppercase text-neutral-500 font-bold">GST TAX INVOICE</div>
            <h1 className="text-sm font-bold text-neutral-950 uppercase font-sans">
              {business.name || 'ACME INDUSTRIES PVT LTD'}
            </h1>
            <div className="text-[9.5px] text-neutral-700">
              {business.address}, {business.city}, {business.state}
            </div>
            <div className="text-[9px] text-neutral-600">
              GSTIN: <strong>{business.gstin}</strong> | PAN: {business.pan} | Ph: {business.phone}
            </div>
          </div>

          <div className="text-right border-l border-neutral-300 pl-3">
            <div className="text-xs font-bold text-neutral-950">{metadata.invoiceNumber}</div>
            <div className="text-[9px] text-neutral-600">Date: {formatDate(metadata.invoiceDate)}</div>
            <div className="text-[9px] text-neutral-600">Due: {formatDate(metadata.dueDate)}</div>
            <div className="text-[9px] text-neutral-600">PO: {metadata.poNumber || 'N/A'}</div>
          </div>
        </div>

        {/* Compact Customer & Place of Supply */}
        <div className="border border-neutral-300 p-2 mb-2 grid grid-cols-2 gap-2 bg-neutral-50/50 text-[9.5px]">
          <div>
            <span className="text-[8px] text-neutral-400 uppercase font-bold block">BUYER / CONSIGNEE</span>
            <div className="font-bold text-neutral-900">{customer.name}</div>
            <div className="text-neutral-700 truncate">{customer.billingAddress}</div>
            <div className="text-neutral-700">{customer.city}, {customer.state}</div>
            <div className="font-bold text-neutral-950 mt-0.5">GSTIN: {customer.gstin || 'UNREGISTERED'}</div>
          </div>
          <div className="border-l border-neutral-200 pl-2">
            <span className="text-[8px] text-neutral-400 uppercase font-bold block">SUPPLY DETAILS</span>
            <div>Place of Supply: <strong>{customer.placeOfSupply || customer.state}</strong></div>
            <div>Terms: {metadata.paymentTerms || 'Net 30 Days'}</div>
            <div>Reverse Charge: {metadata.reverseCharge ? 'YES' : 'NO'}</div>
            <div>Type: {isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
          </div>
        </div>

        {/* Dense Item Table */}
        <div className="border border-neutral-900 mb-2">
          <table className="w-full text-[9.5px] border-collapse">
            <thead>
              <tr className="bg-neutral-200 border-b border-neutral-900 font-bold uppercase text-neutral-900">
                <th className="p-1 border-r border-neutral-400 w-6 text-center">#</th>
                <th className="p-1 border-r border-neutral-400 text-left font-sans">Item / Service Details</th>
                <th className="p-1 border-r border-neutral-400 text-center w-14">HSN</th>
                <th className="p-1 border-r border-neutral-400 text-right w-10">Qty</th>
                <th className="p-1 border-r border-neutral-400 text-right w-16">Rate</th>
                <th className="p-1 border-r border-neutral-400 text-right w-10">Disc</th>
                <th className="p-1 border-r border-neutral-400 text-right w-16">Taxable</th>
                <th className="p-1 border-r border-neutral-400 text-center w-10">GST</th>
                <th className="p-1 text-right w-20">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
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
                    <td className="p-1 border-r border-neutral-300 text-center text-neutral-500">{idx + 1}</td>
                    <td className="p-1 border-r border-neutral-300 font-sans text-neutral-900 font-medium">
                      {item.description || 'Untitled Item'}
                    </td>
                    <td className="p-1 border-r border-neutral-300 text-center text-neutral-600">{item.hsn || '-'}</td>
                    <td className="p-1 border-r border-neutral-300 text-right font-bold text-neutral-950">
                      {qty} <span className="text-[8px] font-normal text-neutral-500">{item.unit}</span>
                    </td>
                    <td className="p-1 border-r border-neutral-300 text-right text-neutral-800">{formatINR(rate, false)}</td>
                    <td className="p-1 border-r border-neutral-300 text-right text-neutral-500">{disc > 0 ? `${disc}%` : '-'}</td>
                    <td className="p-1 border-r border-neutral-300 text-right font-semibold text-neutral-900">{formatINR(taxable)}</td>
                    <td className="p-1 border-r border-neutral-300 text-center text-neutral-700">{gst}%</td>
                    <td className="p-1 text-right font-bold text-neutral-950">{formatINR(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Compact Split Summary & Remittance */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-[9.5px]">
          {/* Left: Bank + Notes */}
          <div className="border border-neutral-300 p-2 space-y-1 bg-neutral-50">
            <div className="font-bold uppercase text-[8.5px] text-neutral-700">Bank Remittance Mandate:</div>
            <div>Bank: <strong>{business.bankName}</strong> | A/c: <strong>{business.accountNumber}</strong></div>
            <div>IFSC: <strong>{business.ifscCode}</strong> | Branch: {business.branch}</div>
            {business.upiId && <div>UPI: {business.upiId}</div>}
            <div className="pt-1 border-t border-neutral-200 text-[8.5px] text-neutral-600">
              Note: {data.notes || 'Payment within 30 days.'}
            </div>
          </div>

          {/* Right: Calculations */}
          <div className="border border-neutral-900 p-2 space-y-0.5 text-right bg-neutral-100">
            <div className="flex justify-between text-neutral-600">
              <span>Taxable Value:</span>
              <span>{formatINR(calculations.taxableAmount)}</span>
            </div>
            {!isInterstate ? (
              <>
                <div className="flex justify-between text-neutral-600">
                  <span>CGST:</span>
                  <span>{formatINR(calculations.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>SGST:</span>
                  <span>{formatINR(calculations.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-neutral-600">
                <span>IGST:</span>
                <span>{formatINR(calculations.totalIgst)}</span>
              </div>
            )}
            {calculations.shippingCharges > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Freight:</span>
                <span>{formatINR(calculations.shippingCharges)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline font-bold text-neutral-950 text-xs pt-1 border-t border-neutral-900">
              <span className="uppercase">Net Total:</span>
              <span className="text-sm">{formatINR(calculations.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="border border-neutral-300 p-1.5 bg-neutral-50 text-[9px] mb-2">
          <strong>INR in Words: </strong>
          <span className="italic font-bold">{calculations.amountInWords}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-900 pt-2 flex justify-between items-end text-[8.5px]">
        <div className="max-w-md text-neutral-500 leading-tight">
          Terms: {data.termsAndConditions}
        </div>
        <div className="text-right">
          <div className="font-bold text-neutral-900 uppercase">For {business.name}</div>
          <div className="mt-4 border-t border-neutral-400 pt-0.5 font-bold">{data.authorizedSignatory || ''}</div>
          <div className="text-neutral-500">{data.signatoryTitle || 'Authorized Signatory'}</div>
        </div>
      </div>
    </div>
  );
};

