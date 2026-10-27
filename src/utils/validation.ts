import { z } from 'zod';

export const PERSON_NAME_REGEX = /^[\p{L}' -]+$/u;
export const PHONE_REGEX = /^\+?\d{7,15}$/;
export const SIMPLE_LABEL_REGEX = /^[\p{L}\p{N}&()'.,/+#:_ -]+$/u;
export const EMPLOYEE_CODE_REGEX = /^[A-Za-z0-9_-]{2,30}$/;

export const optionalTrimmedString = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(''));

export const personName = (label: string, required = true) => {
  let schema = z
    .string()
    .trim()
    .min(3, `${label} must be at least 3 characters`)
    .max(60, `${label} must be 60 characters or fewer`)
    .regex(PERSON_NAME_REGEX, `${label} can contain letters, spaces, apostrophes and hyphens only`);
  return required ? schema : schema.optional().or(z.literal(''));
};

export const entityName = (label: string, min = 3, max = 100) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`)
    .regex(SIMPLE_LABEL_REGEX, `${label} contains unsupported characters`);

export const phoneNumber = (label = 'Phone number', required = true) => {
  const schema = z
    .string()
    .trim()
    .regex(PHONE_REGEX, `${label} must contain only digits, with an optional leading +, and be 7 to 15 digits long`);
  return required ? schema : schema.optional().or(z.literal(''));
};

export const emailAddress = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(120, 'Email must be 120 characters or fewer')
  .email('Enter a valid email address');

export const addressField = z
  .string()
  .trim()
  .min(5, 'Address must be at least 5 characters')
  .max(250, 'Address must be 250 characters or fewer');

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const descriptionField = (label = 'Description', max = 1000) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional().or(z.literal(''));

export const validDateString = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} is invalid`);

export const pastDateString = (label: string) =>
  validDateString(label).refine((value) => new Date(value) < new Date(), `${label} must be in the past`);

export const employeeCode = z
  .string()
  .trim()
  .regex(EMPLOYEE_CODE_REGEX, 'Employee code may contain only letters, numbers, hyphens and underscores (2-30 characters)')
  .optional()
  .or(z.literal(''));

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return errors;
}


/** After validation state is rendered, move the user to the first invalid field. */
export function scrollToFirstError(): void {
  window.setTimeout(() => {
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    const error = document.querySelector<HTMLElement>('[data-field-error="true"]');
    const target = field ?? error;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
  }, 0);
}
