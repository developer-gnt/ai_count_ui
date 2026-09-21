// Mirrors ai-accounting-app-be/src/modules/payments (payment.entity.ts,
// payment-allocation.entity.ts, dto/create-payment.dto.ts).
// NOTE: the payments route is unresolved in the active runtime; both candidate paths returned 404.
export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  CARD = 'CARD',
  UPI = 'UPI',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export interface PaymentAllocation {
  id: string;
  organizationId: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  customerId: string;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  status: PaymentStatus;
  journalEntryId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Present on post/void responses; create returns the raw saved entity.
  allocations?: PaymentAllocation[];
}

export interface PaymentAllocationDto {
  invoiceId: string;
  amount: number;
}

export interface CreatePaymentDto {
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  allocations: PaymentAllocationDto[];
}



