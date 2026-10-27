import { z } from 'zod';
import { descriptionField, entityName } from '@/utils/validation';

export const taskSchema = z.object({
  title: entityName('Task title', 3, 150),
  description: descriptionField('Description', 1500),
  project: z.string().trim().min(1, 'Project is required'),
  assignees: z.array(z.string()).min(1, 'At least one assignee is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
