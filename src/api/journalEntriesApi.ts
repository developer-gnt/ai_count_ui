import { apiClient } from '../lib/axiosInstance';
import { unwrapApiResponse } from './response';
import type {
  JournalEntry,
  CreateJournalEntryDto,
  PostJournalEntryResponse,
  ReverseJournalEntryResponse,
} from './journalEntriesTypes';

// Route note: the active backend exposes this controller under the single global /api/v1 prefix.
// The shared apiClient already supplies /api/v1, so service paths remain relative.
export const journalEntriesApi = {
  // POST /api/v1/journal-entries â€” create draft entry
  async create(payload: CreateJournalEntryDto): Promise<JournalEntry> {
    const response = await apiClient.post('/journal-entries', payload);
    return unwrapApiResponse<JournalEntry>(response.data);
  },
  // GET /api/v1/journal-entries â€” the backend returns a BARE ARRAY
  // (accounting.controller.ts: return { success: true, data } where data =
  // JournalEntry[] from accountingService.findAll), not a paginated shape.
  async list(): Promise<JournalEntry[]> {
    const response = await apiClient.get('/journal-entries');
    return unwrapApiResponse<JournalEntry[]>(response.data);
  },
  // GET /api/v1/journal-entries/:id
  async get(id: string): Promise<JournalEntry> {
    const response = await apiClient.get(`/journal-entries/${id}`);
    return unwrapApiResponse<JournalEntry>(response.data);
  },
  // POST /api/v1/journal-entries/:id/post
  async post(id: string): Promise<PostJournalEntryResponse> {
    const response = await apiClient.post(`/journal-entries/${id}/post`);
    return unwrapApiResponse<PostJournalEntryResponse>(response.data);
  },
  // POST /api/v1/journal-entries/:id/reverse
  async reverse(id: string): Promise<ReverseJournalEntryResponse> {
    const response = await apiClient.post(`/journal-entries/${id}/reverse`);
    return unwrapApiResponse<ReverseJournalEntryResponse>(response.data);
  },
};





