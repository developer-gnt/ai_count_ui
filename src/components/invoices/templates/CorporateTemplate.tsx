import React from 'react';
import { InvoiceFormData, InvoiceCalculations } from '../types';
import { formatINR, formatDate } from '../../../utils/formatters';
import { Award, CheckCheck, Landmark } from 'lucide-react';

interface TemplateProps {
  data: InvoiceFormData;
  calculations: InvoiceCalculations;
}

export const CorporateTemplate: React.FC<TemplateProps> = ({ data, calculations }) => {
  const { business, customer, metadata, items } = data;
  const isInterstate = metadata.isInterstate;

  return (
    <div className="invoice-document bg-white text-neutral-900 text-[11px] leading-relaxed p-6 sm:p-9 font-sans shadow-md border-t-8 border-t-neutral-900 border border-neutral-200 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none min-h-[980px] flex flex-col justify-between">
      <div>
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-neutral-900 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-900 text-white font-mono font-bold text-lg flex items-center justify-center rounded-xs shadow-xs">
              AI
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-950 uppercase tracking-tight">
                {business.name || 'ACME INDUSTRIES PVT LTD'}
              </h1>
              <div className="text-xs text-neutral-600 font-medium">
                {business.tradeName || 'Enterprise Industrial Solutions & Heavy Engineering'}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                GSTIN: <strong className="text-neutral-800">{business.gstin}</strong> â€¢ PAN: {business.pan}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right bg-neutral-100 p-3 rounded-xs border border-neutral-200 min-w-[180px]">
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
              TAX INVOICE
            </div>
            <div className="text-sm font-bold font-mono text-neutral-950 mt-0.5">
              {metadata.invoiceNumber}
            </div>
            <div className="text-[10px] text-neutral-600 font-mono mt-0.5">
              PO Ref: <strong className="text-neutral-900">{metadata.poNumber || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Corporate 2-Column Entity Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supplier Schedule */}
          <div className="border border-neutral-200 p-3.5 rounded-xs bg-neutral-50/40">
            <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-500 border-b border-neutral-200 pb-1 mb-2">
              Supplier & Registered Entity
            </div>
            <div className="text-neutral-700 space-y-1 text-xs">
              <p className="font-bold text-neutral-900">{business.name}</p>
              <p className="text-[11px]">{business.address}</p>
              <p className="text-[11px]">{business.city}, {business.state} - {business.pincode}</p>
              <div className="pt-1 text-[10px] font-mono text-neutral-600">
                Email: {business.email} â€¢ Tel: {business.phone}
              </div>
            </div>
          </div>

          {/* Consignee / Buyer Schedule */}
          <div className="border border-neutral-200 p-3.5 rounded-xs bg-white">
            <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-500 border-b border-neutral-200 pb-1 mb-2 flex justify-between">
              <span>Customer / Bill To</span>
              <span className="text-neutral-600 font-mono text-[9px]">
                POS: {customer.placeOfSupply || customer.state}
              </span>
            </div>
            <div className="text-neutral-700 space-y-1 text-xs">
              <p className="font-bold text-neutral-950">{customer.name}</p>
              <p className="text-[11px]">{customer.billingAddress}</p>
              <p className="text-[11px]">{customer.city}, {customer.state} {customer.pincode ? `- ${customer.pincode}` : ''}</p>
              <div className="pt-1 text-[10.5px] font-mono font-semibold text-neutral-900 flex justify-between">
                <span>GSTIN: {customer.gstin || 'UNREGISTERED'}</span>
                <span>PAN: {customer.pan || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Period Bar */}
        <div className="bg-neutral-900 text-white px-4 py-2 rounded-xs mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div>
            <span className="text-[9px] text-neutral-400 uppercase block">Invoice Date</span>
            <span>{formatDate(metadata.invoiceDate)}</span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-400 uppercase block">Due Date</span>
            <span>{formatDate(metadata.dueDate)}</span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-400 uppercase block">Terms</span>
            <span>{metadata.paymentTerms || 'Net 30 Days'}</span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-400 uppercase block">Tax Regime</span>
            <span>{isInterstate ? 'IGST (Inter-State)' : 'CGST + SGST (Intra-State)'}</span>
          </div>
        </div>

        {/* Corporate Items Table */}
        <div className="border border-neutral-300 rounded-xs overflow-hidden mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800 font-mono text-[10px] uppercase border-b border-neutral-300">
                <th className="p-2.5 text-center w-8">#</th>
                <th className="p-2.5 text-left">Description of Goods / Scope</th>
                <th className="p-2.5 text-center w-20">HSN/SAC</th>
                <th className="p-2.5 text-right w-14">Qty</th>
                <th className="p-2.5 text-right w-24">Unit Rate</th>
                <th className="p-2.5 text-right w-14">Disc</th>
                <th className="p-2.5 text-right w-14">GST</th>
                <th className="p-2.5 text-right w-28">Net Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
              {items.map((item, idx) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const disc = Number(item.discountPct) || 0;
                const gst = Number(item.gstRate) || 0;
                const taxable = qty * rate * (1 - disc / 100);
                const taxAmt = (taxable * gst) / 100;
                const lineTotal = taxable + taxAmt;

                return (
                  <tr key={item.id || idx} className="hover:bg-neutral-50">
                    <td className="p-2.5 text-center text-neutral-500">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-medium text-neutral-900">
                      {item.description || 'Untitled Line Item'}
                    </td>
                    <td className="p-2.5 text-center text-neutral-600">{item.hsn || '-'}</td>
                    <td className="p-2.5 text-right font-bold text-neutral-900">{qty} {item.unit}</td>
                    <td className="p-2.5 text-right text-neutral-700">{formatINR(rate, false)}</td>
                    <td className="p-2.5 text-right text-neutral-500">{disc > 0 ? `${disc}%` : '-'}</td>
                    <td className="p-2.5 text-right text-neutral-600">{gst}%</td>
                    <td className="p-2.5 text-right font-bold text-neutral-950">{formatINR(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Corporate Summary & Banking Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          <div className="md:col-span-6 border border-neutral-200 p-4 rounded-xs text-xs font-mono space-y-2">
            <div className="font-bold text-[10px] uppercase text-neutral-700 flex items-center gap-1.5 pb-1 border-b border-neutral-200">
              <Landmark size={13} className="text-neutral-900" />
              <span>Corporate Bank Clearing Mandate</span>
            </div>
            <div className="space-y-1 text-neutral-700 text-[10.5px]">
              <div>Beneficiary: <strong className="text-neutral-900">{business.name}</strong></div>
              <div>Bank: <strong className="text-neutral-900">{business.bankName}</strong></div>
              <div>Account Number: <strong className="text-neutral-900">{business.accountNumber}</strong></div>
              <div>IFSC Code: <strong className="text-neutral-900">{business.ifscCode}</strong></div>
              <div>Branch: {business.branch}</div>
            </div>
            <div className="pt-2 border-t border-neutral-200 text-[10px] text-neutral-500 italic">
              Words: INR {calculations.amountInWords}
            </div>
          </div>

          <div className="md:col-span-6 font-mono text-xs space-y-1.5 p-4 bg-neutral-50 border border-neutral-200 rounded-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Gross Taxable Subtotal:</span>
              <span>{formatINR(calculations.taxableAmount)}</span>
            </div>
            {!isInterstate ? (
              <>
                <div className="flex justify-between text-neutral-600">
                  <span>Central GST (CGST):</span>
                  <span>{formatINR(calculations.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>State GST (SGST):</span>
                  <span>{formatINR(calculations.totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-neutral-600">
                <span>Integrated GST (IGST):</span>
                <span>{formatINR(calculations.totalIgst)}</span>
              </div>
            )}
            {calculations.shippingCharges > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Freight / Delivery Charges:</span>
                <span>{formatINR(calculations.shippingCharges)}</span>
              </div>
            )}
            <div className="border-t-2 border-neutral-900 pt-2 flex justify-between items-baseline font-bold text-neutral-950 text-sm">
              <span className="uppercase">Net Amount Payable:</span>
              <span className="text-lg">{formatINR(calculations.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Verification Footer */}
      <div className="border-t border-neutral-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-end">
        <div>
          <span className="font-mono text-[9.5px] font-bold uppercase text-neutral-500 block mb-1">Corporate Terms</span>
          <p className="text-[10px] text-neutral-600 leading-relaxed">{data.termsAndConditions}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] text-neutral-500 font-mono uppercase">Executive Authority</div>
          <div className="font-bold text-neutral-950 text-xs mb-6 uppercase">{business.name}</div>
          <div className="border-t border-neutral-400 pt-1 w-48 text-center font-mono">
            <div className="font-bold text-neutral-900 text-xs">{data.authorizedSignatory || ''}</div>
            <div className="text-[9px] text-neutral-500">{data.signatoryTitle || 'Finance Director'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};


