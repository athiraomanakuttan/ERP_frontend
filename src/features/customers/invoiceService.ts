import { apiClient } from '@/services/apiClient';
import { Customer } from './customerService';
export interface InvoiceItem { itemName: string; quantity: number; rate: number; discountType: 'percentage'|'amount'; discountValue: number; total: number; }
export interface Invoice {
  _id: string; customer: Customer|string; customerName: string; customerEmail: string; customerVatNumber?: string; currency: string;
  invoiceNumber: string; orderNumber?: string; invoiceDate: string; terms: string; dueDate: string; salesPerson: string; companyVatNumber?: string; companyBankName?: string; companyBankAccountNumber?: string; companyBankBranch?: string;
  subject: string; vatPercent: number; items: InvoiceItem[]; subtotal: number; totalBeforeVat: number; vatAmount: number; grandTotal: number;
  amountPaid: number; balanceDue: number; status: 'draft'|'issued'|'partially_paid'|'paid'|'cancelled'; createdAt: string;
}
export interface InvoicePayload { customer: string; invoiceNumber: string; orderNumber?: string; invoiceDate: string; terms: string; dueDate: string; salesPerson: string; subject: string; items: Array<Omit<InvoiceItem,'total'>>; }
export async function nextInvoiceNumber() { const { data } = await apiClient.get('/invoices/next-number'); return data.data.invoiceNumber as string; }
export async function listInvoices(params: Record<string, any> = {}) { const { data } = await apiClient.get('/invoices', { params }); return { items: data.data as Invoice[], meta: data.meta }; }
export async function getInvoice(id: string) { const { data } = await apiClient.get(`/invoices/${id}`); return data.data as Invoice; }
export async function createInvoice(payload: InvoicePayload) { const { data } = await apiClient.post('/invoices', payload); return data.data as Invoice; }
export async function updateInvoice(id: string, payload: Partial<InvoicePayload>) { const { data } = await apiClient.put(`/invoices/${id}`, payload); return data.data as Invoice; }
export async function issueInvoice(id: string) { const { data } = await apiClient.patch(`/invoices/${id}/issue`); return data.data as Invoice; }
export async function cancelInvoice(id: string) { const { data } = await apiClient.patch(`/invoices/${id}/cancel`); return data.data as Invoice; }
export async function deleteInvoice(id: string) { await apiClient.delete(`/invoices/${id}`); }
async function download(id: string, kind: 'pdf'|'docx', name: string) { const r = await apiClient.get(`/invoices/${id}/${kind}`, { responseType: 'blob' }); const url = URL.createObjectURL(r.data); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
export const downloadInvoicePdf = (invoice: Invoice) => download(invoice._id, 'pdf', `${invoice.invoiceNumber}.pdf`);
export const downloadInvoiceDocx = (invoice: Invoice) => download(invoice._id, 'docx', `${invoice.invoiceNumber}.docx`);
