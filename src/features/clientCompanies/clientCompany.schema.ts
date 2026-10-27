import { z } from 'zod';
import { descriptionField, entityName, personName, phoneNumber } from '@/utils/validation';

export const clientCompanySchema = z.object({
  companyName: entityName('Company name', 3, 120),
  contactPerson: personName('Contact person', false),
  phone: phoneNumber('Phone number', false),
  status: z.enum(['active', 'inactive']).optional(),
  notes: descriptionField('Notes', 1000),
});

export type ClientCompanyFormValues = z.infer<typeof clientCompanySchema>;
