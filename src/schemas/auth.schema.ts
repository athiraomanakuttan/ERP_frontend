import { z } from 'zod';
import { emailAddress } from '@/utils/validation';

export const loginSchema = z.object({
  email: emailAddress,
  password: z.string().min(1, 'Password is required').max(72, 'Password is too long'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
