import { apiClient } from '../lib/axiosInstance';
import { unwrapApiResponse } from './response';
import type {
  Expense,
  CreateExpenseDto,
  PostExpenseDto,
} from './expensesTypes';

// Route note: the active backend exposes this controller under the single global /api/v1 prefix.
// The shared apiClient already supplies /api/v1, so service paths remain relative.
export const expensesApi = {
  async create(payload: CreateExpenseDto): Promise<Expense> {
    const response = await apiClient.post('/expenses', payload);
    return unwrapApiResponse<Expense>(response.data);
  },
  async list(): Promise<Expense[]> {
    const response = await apiClient.get('/expenses');
    return unwrapApiResponse<Expense[]>(response.data);
  },
  async get(id: string): Promise<Expense> {
    const response = await apiClient.get(`/expenses/${id}`);
    return unwrapApiResponse<Expense>(response.data);
  },
  async submit(id: string): Promise<Expense> {
    const response = await apiClient.post(`/expenses/${id}/submit`);
    return unwrapApiResponse<Expense>(response.data);
  },
  async approve(id: string): Promise<Expense> {
    const response = await apiClient.post(`/expenses/${id}/approve`);
    return unwrapApiResponse<Expense>(response.data);
  },
  async post(id: string, payload: PostExpenseDto): Promise<Expense> {
    const response = await apiClient.post(`/expenses/${id}/post`, payload);
    return unwrapApiResponse<Expense>(response.data);
  },
  async reverse(id: string): Promise<Expense> {
    const response = await apiClient.post(`/expenses/${id}/reverse`);
    return unwrapApiResponse<Expense>(response.data);
  },
  async cancel(id: string): Promise<Expense> {
    const response = await apiClient.post(`/expenses/${id}/cancel`);
    return unwrapApiResponse<Expense>(response.data);
  },
};



