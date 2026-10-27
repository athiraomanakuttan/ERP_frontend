import { apiClient } from '@/services/apiClient';
import { Holiday, PaginatedResult } from '@/types/entities';

export interface HolidayListParams {
  page?: number;
  limit?: number;
  branch?: string;
  from?: string;
  to?: string;
}

export interface HolidayPayload {
  name: string;
  date: string;
  branches: string[];
}

export async function listHolidays(params: HolidayListParams): Promise<PaginatedResult<Holiday>> {
  const { data } = await apiClient.get('/holidays', { params });
  return data.meta;
}

export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  const { data } = await apiClient.post('/holidays', payload);
  return data.data;
}

export async function updateHoliday(id: string, payload: Partial<HolidayPayload>): Promise<Holiday> {
  const { data } = await apiClient.put(`/holidays/${id}`, payload);
  return data.data;
}

export async function getUpcomingHolidays(limit = 5): Promise<Holiday[]> {
  const { data } = await apiClient.get('/holidays/upcoming', { params: { limit } });
  return data.data;
}

export async function deleteHoliday(id: string): Promise<void> {
  await apiClient.delete(`/holidays/${id}`);
}
