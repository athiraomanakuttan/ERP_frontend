import { z } from 'zod';
import { descriptionField, entityName } from '@/utils/validation';

export const projectSchema = z
  .object({
    name: entityName('Project name', 3, 120),
    clientCompany: z.string().trim().min(1, 'Client company is required'),
    description: descriptionField('Description', 1500),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['planned', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    projectManager: z.string().optional(),
    notes: descriptionField('Notes', 1500),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export type ProjectFormValues = z.infer<typeof projectSchema>;
