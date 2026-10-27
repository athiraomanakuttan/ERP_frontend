import { z } from 'zod';
import { entityName } from '@/utils/validation';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const branchSchema = z
  .object({
    name: entityName('Branch name', 3, 100),
    timezone: z.string().trim().min(1, 'Timezone is required'),
    workingDays: z
      .array(z.object({ day: z.enum(DAYS), isWorking: z.boolean() }))
      .length(7)
      .refine((days) => days.some((d) => d.isWorking), 'Select at least one working day'),
    workingStartTime: z.string().regex(timeRegex, 'Enter a valid start time'),
    workingEndTime: z.string().regex(timeRegex, 'Enter a valid end time'),
  })
  .refine((data) => data.workingStartTime < data.workingEndTime, {
    message: 'Working end time must be after start time',
    path: ['workingEndTime'],
  });

export type BranchFormValues = z.infer<typeof branchSchema>;

export function defaultWorkingDays() {
  return DAYS.map((day) => ({ day, isWorking: day !== 'saturday' && day !== 'sunday' }));
}
