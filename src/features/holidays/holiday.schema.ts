import { z } from 'zod';
import { entityName, validDateString } from '@/utils/validation';

export const holidaySchema = z.object({
  name: entityName('Holiday name', 3, 100),
  date: validDateString('Date'),
  branches: z.array(z.string()).min(1, 'Select at least one branch'),
});

export type HolidayFormValues = z.infer<typeof holidaySchema>;
