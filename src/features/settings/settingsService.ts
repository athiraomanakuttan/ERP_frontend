import { apiClient } from '@/services/apiClient';

export interface AppSettings {
  _id: string;
  companyName: string;
  logoDataUrl?: string;
  themeColor: string;
  companyVatNumber?: string;
  companyBankName?: string;
  companyBankAccountNumber?: string;
  companyBankBranch?: string;
  invoiceLogoDataUrl?: string;
  defaultVatPercent?: number;
  defaultSalesPerson?: string;
  defaultCurrency?: string;
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await apiClient.get('/settings');
  return data.data;
}

export async function getAdminSettings(): Promise<AppSettings> {
  const { data } = await apiClient.get('/settings/admin');
  return data.data;
}

export async function updateSettings(payload: Partial<AppSettings>): Promise<AppSettings> {
  const { data } = await apiClient.put('/settings', payload);
  return data.data;
}
