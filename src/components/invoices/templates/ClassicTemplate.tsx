import React from 'react';
import { InvoiceFormData, InvoiceCalculations } from '../types';
import { formatINR, formatDate } from '../../../utils/formatters';
import { Building2, ShieldCheck, QrCode } from 'lucide-react';

interface TemplateProps {
  data: InvoiceFormData;
  calculations: InvoiceCalculations;
}

export const ClassicTemplate: React.FC<TemplateProps> = ({ data, calculations }) => {
  const { business, customer, metadata, items } = data;
  const isInterstate = metadata.isInterstate;

  return (
    <div className="invoice-document bg-white text-neutral-900 text-[11px] leading-relaxed p-6 sm:p-8 font-sans border border-neutral-300 shadow-xs max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none min-h-[980px] flex flex-col justify-between">
      <div>
        {/* Top Title Banner */}
        <div className="border border-neutral-900 text-center py-1.5 bg-neutral-100 font-bold uppercase tracking-widest text-xs font-mono mb-2">
          TAX INVOICE
          <span className="text-[9px] font-normal tracking-normal text-neutral-600 block">
            (Issued under Section 31 of the CGST Act, 2017 â€¢ Original for Recipient)
          </span>
        </div>

        {/* Header: Seller Details & Invoice Meta */}
        <div className="border border-neutral-900 mb-2 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-900">
          {/* Supplier Info */}
          <div className="p-3 bg-neutral-50/50">
            <div className="flex items-start gap-2 mb-1">
              <div className="w-7 h-7 bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                AI
              </div>
              <div>
                <h1 className="font-bold text-sm text-neutral-950 uppercase tracking-tight">
                  {business.name || 'ACME INDUSTRIES PVT LTD'}
                </h1>
                {business.tradeName && (
                  <div className="text-[10px] text-neutral-600 font-medium">
                    {business.tradeName}
                  </div>
                )}
              </div>
            </div>
            <div className="text-neutral-700 text-[10.5px] mt-1 space-y-0.5">
              <p>{business.address}</p>
              <p>
                {business.city}, {business.state} - {business.pincode}
              </p>
              <p className="font-mono text-[10px] pt-1">
                <strong>GSTIN:</strong> <span className="font-bold text-neutral-900">{business.gstin}</span> | <strong>PAN:</strong> {business.pan}
              </p>
              <p className="text-[10px] text-neutral-600">
                Email: {business.email} | Phone: {business.phone}
              </p>
            </div>
          </div>

          {/* Invoice Metadata Grid */}
          <div className="grid grid-cols-2 divide-x divide-y divide-neutral-300 text-[10px]">
            <div className="p-2">
              <div className="text-neutral-500 uppercase font-mono text-[9px]">Invoice No.</div>
              <div className="font-bold font-mono text-neutral-950 text-xs mt-0.5">
                {metadata.invoiceNumber}
              </div>
            </div>
            <div className="p-2">
              <div className="text-neutral-500 uppercase font-mono text-[9px]">Invoice Date</div>
              <div className="font-bold font-mono text-neutral-900 mt-0.5">
                {formatDate(metadata.invoiceDate)}
              </div>
            </div>
            <div className="p-2">
              <div className="text-neutral-500 uppercase font-mono text-[9px]">Due Date</div>
              <div className="font-mono text-neutral-900 mt-0.5">
                {formatDate(metadata.dueDate)}
              </div>
            </div>
            <div className="p-2">
              <div className="text-neutral-500 uppercase font-mono text-[9px]">Payment Terms</div>
              <div className="font-medium text-neutral-900 mt-0.5">
                {metadata.paymentTerms || 'Net 30 Days'}
              </div>
            </div>
            <div className="p-2">
              <div className="text-neutral-500 uppercase font-mono text-[9px]">PO / Ref No.</div>
              <div className="font-mono text-neutral-900 mt-0.5">
                {metadata.poNumber || 'N/A'}
              </div>
            </div>
            <div className="p-2">
              <div className="text-neutral-500 uppercase font-mono text-[9px]">Place of Supply</div>
              <div className="font-medium text-neutral-900 mt-0.5 truncate">
                {customer.placeOfSupply || customer.state}
              </div>
            </div>
            <div className="p-2 col-span-2 bg-neutral-50 flex items-center justify-between">
              <span className="text-neutral-600 font-mono text-[9px] uppercase">
                Reverse Charge: {metadata.reverseCharge ? 'Applicable (Yes)' : 'Not Applicable (No)'}
              </span>
              <span className="text-neutral-700 font-mono text-[9px] font-bold uppercase">
                Supply Type: {isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </span>
            </div>
          </div>
        </div>

        {/* Customer / Billed To Section */}
        <div className="border border-neutral-900 mb-3 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-900">
          <div className="p-2.5">
            <div className="text-[9px] font-bold font-mono uppercase tracking-wider text-neutral-500 border-b border-neutral-200 pb-1 mb-1">
              Billed To (Details of Receiver / Buyer):
            </div>
            <div className="font-bold text-neutral-950 text-xs">{customer.name}</div>
            {customer.tradeName && <div className="text-[10px] text-neutral-600">{customer.tradeName}</div>}
            <div className="text-neutral-700 text-[10.5px] mt-0.5">
              <p>{customer.billingAddress}</p>
              <p>{customer.city}, {customer.state} {customer.pincode ? `- ${customer.pincode}` : ''}</p>
            </div>
            <div className="font-mono text-[10px] mt-1 pt-1 border-t border-neutral-100 flex flex-wrap gap-x-3">
              <span><strong>GSTIN:</strong> <strong className="text-neutral-950">{customer.gstin || 'UNREGISTERED'}</strong></span>
              {customer.pan && <span><strong>PAN:</strong> {customer.pan}</span>}
            </div>
            {customer.contactPerson && (
              <div className="text-[9.5px] text-neutral-500 mt-0.5">Attn: {customer.contactPerson}</div>
            )}
          </div>

          <div className="p-2.5 bg-neutral-50/30">
            <div className="text-[9px] font-bold font-mono uppercase tracking-wider text-neutral-500 border-b border-neutral-200 pb-1 mb-1">
              Shipped To (Details of Consignee):
            </div>
            <div className="font-semibold text-neutral-900 text-xs">
              {customer.shippingAddress ? customer.name : 'Same as Billed To Address'}
            </div>
            <div className="text-neutral-700 text-[10.5px] mt-0.5">
              <p>{customer.shippingAddress || customer.billingAddress}</p>
              <p>{customer.city}, {customer.state}</p>
            </div>
            <div className="font-mono text-[10px] mt-1 pt-1 border-t border-neutral-100">
              <span><strong>State Code:</strong> {customer.state.match(/\((\d+)\)/)?.[1] || '27'}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-neutral-900 mb-3 overflow-hidden">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-900 font-mono text-[9px] font-bold uppercase text-neutral-800">
                <th className="p-1.5 border-r border-neutral-300 w-8 text-center">#</th>
                <th className="p-1.5 border-r border-neutral-300 text-left">Item / Service Description</th>
                <th className="p-1.5 border-r border-neutral-300 text-center w-16">HSN/SAC</th>
                <th className="p-1.5 border-r border-neutral-300 text-right w-12">Qty</th>
                <th className="p-1.5 border-r border-neutral-300 text-center w-12">Unit</th>
                <th className="p-1.5 border-r border-neutral-300 text-right w-20">Rate (â‚¹)</th>
                <th className="p-1.5 border-r border-neutral-300 text-right w-14">Disc %</th>
                <th className="p-1.5 border-r border-neutral-300 text-right w-20">Taxable Val</th>
                <th className="p-1.5 border-r border-neutral-300 text-center w-12">GST %</th>
                <th className="p-1.5 text-right w-24">Total (â‚¹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-mono">
              {items.map((item, idx) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const disc = Number(item.discountPct) || 0;
                const gst = Number(item.gstRate) || 0;
                const taxable = qty * rate * (1 - disc / 100);
                const taxAmt = (taxable * gst) / 100;
                const lineTotal = taxable + taxAmt;

                return (
                  <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                    <td className="p-1.5 border-r border-neutral-300 text-center text-neutral-500">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-left font-sans text-neutral-900 font-medium">
                      {item.description || 'Untitled Item'}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-center text-neutral-600">
                      {item.hsn || '-'}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-right font-bold text-neutral-900">
                      {qty}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-center text-neutral-600">
                      {item.unit || 'NOS'}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-right text-neutral-800">
                      {formatINR(rate, false)}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-right text-neutral-600">
                      {disc > 0 ? `${disc}%` : '-'}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-right font-bold text-neutral-900">
                      {formatINR(taxable)}
                    </td>
                    <td className="p-1.5 border-r border-neutral-300 text-center text-neutral-700">
                      {gst}%
                    </td>
                    <td className="p-1.5 text-right font-bold text-neutral-950">
                      {formatINR(lineTotal)}
                    </td>
                  </tr>
                );
              })}
              {/* Filler rows if items are few */}
              {items.length < 3 &&
                Array.from({ length: 3 - items.length }).map((_, i) => (
                  <tr key={`fill-${i}`} className="h-6 opacity-30">
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td className="border-r border-neutral-300"></td>
                    <td></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* GST Breakup Table & Totals Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mb-3">
          {/* Left: GST Schedule & Tax Table */}
          <div className="lg:col-span-7 border border-neutral-900 p-2 text-[9.5px]">
            <div className="font-bold font-mono uppercase text-neutral-700 text-[9px] mb-1">
              GST Tax Schedule Breakup:
            </div>
            <table className="w-full text-left border border-neutral-300 font-mono text-[9px]">
              <thead className="bg-neutral-100 border-b border-neutral-300">
                <tr>
                  <th className="p-1 border-r border-neutral-300">HSN/SAC</th>
                  <th className="p-1 border-r border-neutral-300 text-right">Taxable</th>
                  {!isInterstate ? (
                    <>
                      <th className="p-1 border-r border-neutral-300 text-right">CGST</th>
                      <th className="p-1 border-r border-neutral-300 text-right">SGST</th>
                    </>
                  ) : (
                    <th className="p-1 border-r border-neutral-300 text-right">IGST</th>
                  )}
                  <th className="p-1 text-right">Tax Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="p-1 border-r border-neutral-300">Combined</td>
                  <td className="p-1 border-r border-neutral-300 text-right">
                    {formatINR(calculations.taxableAmount)}
                  </td>
                  {!isInterstate ? (
                    <>
                      <td className="p-1 border-r border-neutral-300 text-right">
                        {formatINR(calculations.totalCgst)}
                      </td>
                      <td className="p-1 border-r border-neutral-300 text-right">
                        {formatINR(calculations.totalSgst)}
                      </td>
                    </>
                  ) : (
                    <td className="p-1 border-r border-neutral-300 text-right">
                      {formatINR(calculations.totalIgst)}
                    </td>
                  )}
                  <td className="p-1 text-right font-bold">
                    {formatINR(calculations.totalTax)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bank Details Box */}
            <div className="mt-2 pt-2 border-t border-neutral-200">
              <div className="font-bold font-mono text-[9px] uppercase text-neutral-800">
                Bank Remittance & RTGS / NEFT Details:
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] font-mono mt-1 text-neutral-700">
                <div>Bank: <strong className="text-neutral-900">{business.bankName || 'HDFC Bank Ltd'}</strong></div>
                <div>A/c No: <strong className="text-neutral-900">{business.accountNumber || '50200012345678'}</strong></div>
                <div>IFSC: <strong className="text-neutral-900">{business.ifscCode || 'HDFC0000060'}</strong></div>
                <div>Branch: {business.branch || 'MIDC Andheri East'}</div>
                {business.upiId && <div>UPI ID: <span className="text-neutral-900">{business.upiId}</span></div>}
              </div>
            </div>
          </div>

          {/* Right: Calculations & Grand Total */}
          <div className="lg:col-span-5 border border-neutral-900 p-2.5 bg-neutral-50/50 flex flex-col justify-between font-mono text-[10px]">
            <div className="space-y-1">
              <div className="flex justify-between text-neutral-700">
                <span>Subtotal (Gross):</span>
                <span>{formatINR(calculations.subtotal)}</span>
              </div>
              {calculations.itemDiscounts > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Line Discounts:</span>
                  <span>- {formatINR(calculations.itemDiscounts)}</span>
                </div>
              )}
              {calculations.additionalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Additional Discount:</span>
                  <span>- {formatINR(calculations.additionalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                <span>Taxable Value:</span>
                <span>{formatINR(calculations.taxableAmount)}</span>
              </div>

              {!isInterstate ? (
                <>
                  <div className="flex justify-between text-neutral-700">
                    <span>Central GST (CGST):</span>
                    <span>{formatINR(calculations.totalCgst)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700">
                    <span>State GST (SGST):</span>
                    <span>{formatINR(calculations.totalSgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-neutral-700">
                  <span>Integrated GST (IGST):</span>
                  <span>{formatINR(calculations.totalIgst)}</span>
                </div>
              )}

              {calculations.shippingCharges > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Freight / Shipping:</span>
                  <span>{formatINR(calculations.shippingCharges)}</span>
                </div>
              )}

              {Math.abs(calculations.roundOff) > 0 && (
                <div className="flex justify-between text-neutral-500 text-[9px]">
                  <span>Round Off:</span>
                  <span>{calculations.roundOff > 0 ? `+${calculations.roundOff}` : calculations.roundOff}</span>
                </div>
              )}
            </div>

            {/* Grand Total Box */}
            <div className="border-t-2 border-neutral-900 pt-1.5 mt-2">
              <div className="flex justify-between items-baseline font-bold text-neutral-950 text-sm">
                <span className="uppercase">Invoice Total:</span>
                <span className="text-base">{formatINR(calculations.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="border border-neutral-900 p-2 bg-neutral-100 text-[10px] mb-3">
          <span className="font-mono uppercase font-bold text-neutral-600 text-[9px]">Amount in Words: </span>
          <span className="font-serif italic font-bold text-neutral-900">
            INR {calculations.amountInWords}
          </span>
        </div>
      </div>

      {/* Footer: Terms & Signature */}
      <div className="border-t border-neutral-900 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-[9.5px]">
        <div>
          <div className="font-bold font-mono text-[9px] uppercase text-neutral-800 mb-0.5">
            Declaration & Terms:
          </div>
          <p className="text-neutral-600 text-[9px] whitespace-pre-line leading-tight">
            {data.termsAndConditions}
          </p>
        </div>

        <div className="text-right flex flex-col justify-between items-end min-h-[70px]">
          <div className="font-bold text-neutral-900 uppercase text-[10px]">
            For {business.name || 'ACME INDUSTRIES PVT LTD'}
          </div>
          <div className="mt-6 border-t border-neutral-400 pt-1 w-44 text-center">
            <div className="font-bold text-neutral-900 text-[10px]">{data.authorizedSignatory || ''}</div>
            <div className="text-[8.5px] text-neutral-500">{data.signatoryTitle || 'Authorized Signatory'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

