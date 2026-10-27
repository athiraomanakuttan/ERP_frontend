import { z } from 'zod';
export const customerFormSchema = z.object({
  customerType: z.enum(['individual','business']),
  primaryContactName: z.string().trim().min(3, 'Name must be at least 3 characters').regex(/^[\p{L}' -]+$/u, 'Name cannot contain numbers'),
  contactNumber: z.string().trim().regex(/^\+?\d{7,15}$/, 'Enter a valid phone number'),
  companyName: z.string().trim().max(120).optional(),
  email: z.string().trim().email('Enter a valid email'),
  vatNumber: z.string().trim().min(1, 'VAT number is required').max(60),
  currency: z.string().length(3),
}).superRefine((d,ctx)=>{ if(d.customerType==='business'&&!d.companyName) ctx.addIssue({code:z.ZodIssueCode.custom,path:['companyName'],message:'Company name is required'}); });
