import { z } from 'zod';
import { descriptionField, entityName } from '@/utils/validation';

export const roleSchema = z.object({
  name: entityName('Role name', 3, 80),
  description: descriptionField('Description', 500),
  permissions: z.array(z.string()).default([]),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
