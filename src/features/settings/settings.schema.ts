import { z } from 'zod';
export const settingsSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(120),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color'),
  companyVatNumber: z.string().trim().min(1, 'Company VAT number is required').max(80),
  companyBankName: z.string().trim().min(2, 'Bank name is required').max(120),
  companyBankAccountNumber: z.string().trim().min(2, 'Bank account number is required').max(120),
  companyBankBranch: z.string().trim().min(2, 'Bank branch is required').max(120),
  defaultVatPercent: z.coerce.number().min(0).max(100),
  defaultSalesPerson: z.string().trim().min(2).max(100),
  defaultCurrency: z.string().length(3),
});
