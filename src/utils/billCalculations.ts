/**
 * Single deterministic bill-calculation source of truth for the OCR review
 * flow. Line taxable amounts are recomputed from line data; printed OCR tax
 * components are kept as entered (they are printed totals, not per-line), and
 * the grand total is derived as items + taxes + adjustments.
 */
export interface CalcLineInput {
  quantity: number | undefined;
  unitPrice: number | undefined;
  discount: number | undefined;
  taxableAmount?: number | undefined;
}

export interface CalcTotalsInput {
  lines: CalcLineInput[];
  cgst: number | undefined;
  sgst: number | undefined;
  igst: number | undefined;
  cess?: number | undefined;
  shipping: number | undefined;
  roundOff: number | undefined;
}

export interface CalcResult {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
}

const sanitize = (v: number | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;

/** Round half-up to 2dp (Indian accounting convention). */
export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Recompute the derived accounting totals from line data + printed tax
 * components. Deterministic and used by both the editor and the final review
 * screen — never duplicated per component.
 */
export function calculateBillTotals(input: CalcTotalsInput): CalcResult {
  const subtotal = round2(
    input.lines.reduce(
      (sum, line) => sum + sanitize(line.quantity) * sanitize(line.unitPrice),
      0,
    ),
  );
  const totalDiscount = round2(input.lines.reduce((sum, line) => sum + sanitize(line.discount), 0));
  const taxableAmount = round2(
    input.lines.reduce((sum, line) => {
      if (typeof line.taxableAmount === 'number' && Number.isFinite(line.taxableAmount)) {
        return sum + Math.max(0, line.taxableAmount);
      }
      return sum + sanitize(line.quantity) * sanitize(line.unitPrice);
    }, 0),
  );
  const totalTax = round2(
    sanitize(input.cgst) + sanitize(input.sgst) + sanitize(input.igst) + sanitize(input.cess),
  );
  const grandTotal = round2(taxableAmount + totalTax + sanitize(input.shipping) + sanitize(input.roundOff));

  return { subtotal, totalDiscount, taxableAmount, totalTax, grandTotal };
}

/**
 * Reconciles OCR-printed values against recomputed ones. Returns advisory
 * findings only — never mutates data or blocks the flow.
 */
export interface ReconciliationFinding {
  code: string;
  message: string;
}

export function reconcileOcrTotals(
  input: CalcTotalsInput & { printedTaxable?: number | undefined; printedGrandTotal?: number | undefined },
): ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = [];
  const calc = calculateBillTotals(input);

  if (input.printedTaxable !== undefined && input.printedTaxable > 0) {
    const diff = round2(Math.abs(calc.taxableAmount - input.printedTaxable));
    if (diff > 1) {
      findings.push({
        code: 'TAXABLE_MISMATCH',
        message: `Recomputed taxable value (₹${calc.taxableAmount.toLocaleString('en-IN')}) differs from the printed taxable value (₹${input.printedTaxable.toLocaleString('en-IN')}) by ₹${diff.toLocaleString('en-IN')}. Verify line items or tax components.`,
      });
    }
  }

  if (input.printedGrandTotal !== undefined && input.printedGrandTotal > 0) {
    const diff = round2(Math.abs(calc.grandTotal - input.printedGrandTotal));
    if (diff > 1) {
      findings.push({
        code: 'GRAND_TOTAL_MISMATCH',
        message: `Calculated grand total (₹${calc.grandTotal.toLocaleString('en-IN')}) differs from the printed grand total (₹${input.printedGrandTotal.toLocaleString('en-IN')}) by ₹${diff.toLocaleString('en-IN')}. Verify the OCR tax components.`,
      });
    }
  }

  return findings;
}
