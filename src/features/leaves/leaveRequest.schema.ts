import { z } from 'zod';
import { descriptionField, validDateString } from '@/utils/validation';

export const leaveRequestSchema = z
  .object({
    leaveType: z.string().trim().min(1, 'Leave type is required'),
    startDate: validDateString('Start date'),
    endDate: validDateString('End date'),
    reason: descriptionField('Reason', 500),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  });

export type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;
