import { apiClient } from '../lib/axiosInstance';
import { unwrapApiResponse } from './response';
import type { Payment, CreatePaymentDto } from './paymentsTypes';

// Route note: runtime probes returned 404 for both /api/v1/payments and the doubled path.
// Leave this separate route unchanged until its backend contract is confirmed.
export const paymentsApi = {
  async create(payload: CreatePaymentDto): Promise<Payment> {
    const response = await apiClient.post('/api/v1/payments', payload);
    return unwrapApiResponse<Payment>(response.data);
  },
  async post(id: string): Promise<Payment> {
    const response = await apiClient.post(`/api/v1/payments/${id}/post`);
    return unwrapApiResponse<Payment>(response.data);
  },
  async void(id: string): Promise<Payment> {
    const response = await apiClient.post(`/api/v1/payments/${id}/void`);
    return unwrapApiResponse<Payment>(response.data);
  },
};

