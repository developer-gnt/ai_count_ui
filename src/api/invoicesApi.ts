import { apiClient } from '../lib/axiosInstance';
import { unwrapApiResponse } from './response';
import type {
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  DeleteInvoiceResponse,
} from './invoicesTypes';

// Route note: the active backend exposes this controller under the single global /api/v1 prefix.
// The shared apiClient already supplies /api/v1, so service paths remain relative.
export const invoicesApi = {
  async create(payload: CreateInvoiceDto): Promise<Invoice> {
    const response = await apiClient.post('/invoices', payload);
    return unwrapApiResponse<Invoice>(response.data);
  },
  async list(): Promise<Invoice[]> {
    const response = await apiClient.get('/invoices');
    return unwrapApiResponse<Invoice[]>(response.data);
  },
  async get(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/invoices/${id}`);
    return unwrapApiResponse<Invoice>(response.data);
  },
  async update(id: string, payload: UpdateInvoiceDto): Promise<Invoice> {
    const response = await apiClient.patch(`/invoices/${id}`, payload);
    return unwrapApiResponse<Invoice>(response.data);
  },
  async remove(id: string): Promise<DeleteInvoiceResponse> {
    const response = await apiClient.delete(`/invoices/${id}`);
    return unwrapApiResponse<DeleteInvoiceResponse>(response.data);
  },
  async finalize(id: string): Promise<Invoice> {
    const response = await apiClient.post(`/invoices/${id}/finalize`);
    return unwrapApiResponse<Invoice>(response.data);
  },
  async cancel(id: string): Promise<Invoice> {
    const response = await apiClient.post(`/invoices/${id}/cancel`);
    return unwrapApiResponse<Invoice>(response.data);
  },
};



