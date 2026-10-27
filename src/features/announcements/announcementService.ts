import { apiClient } from '@/services/apiClient';
import { Announcement, PaginatedResult } from '@/types/entities';

export async function listAnnouncements(params: { page?: number; limit?: number }): Promise<PaginatedResult<Announcement>> {
  const { data } = await apiClient.get('/announcements', { params });
  return data.meta;
}

export async function createAnnouncement(payload: { title: string; body: string }): Promise<Announcement> {
  const { data } = await apiClient.post('/announcements', payload);
  return data.data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiClient.delete(`/announcements/${id}`);
}
