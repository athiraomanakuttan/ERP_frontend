import { apiClient } from '@/services/apiClient';
import { AttendanceSession, EmployeeRef } from '@/types/entities';

export async function checkIn(): Promise<AttendanceSession> {
  const { data } = await apiClient.post('/attendance/check-in');
  return data.data;
}
export async function checkOut(): Promise<AttendanceSession> {
  const { data } = await apiClient.post('/attendance/check-out');
  return data.data;
}
export async function startBreak(): Promise<AttendanceSession> {
  const { data } = await apiClient.post('/attendance/break/start');
  return data.data;
}
export async function endBreak(): Promise<AttendanceSession> {
  const { data } = await apiClient.post('/attendance/break/end');
  return data.data;
}
export async function myToday(): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get('/attendance/me/today');
  return data.data;
}
export async function myHistory(from: string, to: string): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get('/attendance/me/history', { params: { from, to } });
  return data.data;
}

export async function teamHistory(from: string, to: string, employee?: string): Promise<AttendanceSession[]> {
  const { data } = await apiClient.get('/attendance/team/history', { params: { from, to, employee: employee || undefined } });
  return data.data;
}

export async function teamEmployees(): Promise<EmployeeRef[]> {
  const { data } = await apiClient.get('/attendance/team/employees');
  return data.data;
}
