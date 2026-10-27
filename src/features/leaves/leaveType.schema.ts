import { z } from 'zod';
import { descriptionField, entityName } from '@/utils/validation';

export const leaveTypeSchema = z.object({
  name: entityName('Leave type name', 3, 80),
  defaultDaysPerYear: z.coerce
    .number()
    .int('Leave days must be a whole number')
    .min(0, 'Leave days cannot be negative')
    .max(366, 'Leave days cannot exceed 366'),
  description: descriptionField('Description', 500),
});
