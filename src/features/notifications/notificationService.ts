import { apiClient } from '@/services/apiClient';
import { AppNotification } from '@/types/entities';

export async function listNotifications(unreadOnly = false): Promise<AppNotification[]> {
  const { data } = await apiClient.get('/notifications', { params: unreadOnly ? { unread: 'true' } : {} });
  return data.data;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
