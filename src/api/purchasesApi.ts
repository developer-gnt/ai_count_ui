import { apiClient } from '../lib/axiosInstance';
import { unwrapApiResponse } from './response';
import type {
  PurchaseBill,
  CreatePurchaseBillDto,
  UpdatePurchaseBillDto,
  DeletePurchaseBillResponse,
} from './purchasesTypes';

// Route note: the active backend exposes this controller under the single global /api/v1 prefix.
// The shared apiClient already supplies /api/v1, so service paths remain relative.
export const purchasesApi = {
  async create(payload: CreatePurchaseBillDto): Promise<PurchaseBill> {
    const response = await apiClient.post('/bills', payload);
    return unwrapApiResponse<PurchaseBill>(response.data);
  },
  async list(): Promise<PurchaseBill[]> {
    const response = await apiClient.get('/bills');
    return unwrapApiResponse<PurchaseBill[]>(response.data);
  },
  async get(id: string): Promise<PurchaseBill> {
    const response = await apiClient.get(`/bills/${id}`);
    return unwrapApiResponse<PurchaseBill>(response.data);
  },
  async update(id: string, payload: UpdatePurchaseBillDto): Promise<PurchaseBill> {
    const response = await apiClient.patch(`/bills/${id}`, payload);
    return unwrapApiResponse<PurchaseBill>(response.data);
  },
  async remove(id: string): Promise<DeletePurchaseBillResponse> {
    const response = await apiClient.delete(`/bills/${id}`);
    return unwrapApiResponse<DeletePurchaseBillResponse>(response.data);
  },
  async finalize(id: string): Promise<PurchaseBill> {
    const response = await apiClient.post(`/bills/${id}/finalize`);
    return unwrapApiResponse<PurchaseBill>(response.data);
  },
  async cancel(id: string): Promise<PurchaseBill> {
    const response = await apiClient.post(`/bills/${id}/cancel`);
    return unwrapApiResponse<PurchaseBill>(response.data);
  },
};



