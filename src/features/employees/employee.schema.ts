import { z } from 'zod';
import {
  addressField,
  emailAddress,
  employeeCode,
  entityName,
  pastDateString,
  passwordField,
  personName,
  phoneNumber,
  validDateString,
} from '@/utils/validation';

const emergencyContactSchema = z
  .object({
    name: personName('Emergency contact name', false),
    phone: phoneNumber('Emergency contact phone', false),
    relation: entityName('Relationship', 2, 40).optional().or(z.literal('')),
  })
  .optional();

export const employeeSchema = z.object({
  firstName: personName('First name'),
  lastName: personName('Last name', false),
  dateOfBirth: pastDateString('Date of birth'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  phone: phoneNumber('Phone number'),
  email: emailAddress,
  address: addressField,
  employeeCode,
  joiningDate: validDateString('Joining date'),
  department: entityName('Department', 2, 80).optional().or(z.literal('')),
  role: z.string().trim().min(1, 'Role is required'),
  branch: z.string().trim().min(1, 'Branch is required'),
  reportingManager: z.string().optional(),
  teamLead: z.string().optional(),
  emergencyContact: emergencyContactSchema,
  initialPassword: passwordField.optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
