import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { ErrorText } from '@/components/atoms/ErrorText';
import { employeeSchema } from './employee.schema';
import { passwordField, scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createEmployee, updateEmployee, adminResetEmployeePassword, EmployeePayload } from './employeeService';
import { listRoles } from '@/features/roles/roleService';
import { listBranches } from '@/features/branches/branchService';
import { EmployeeCombobox } from './EmployeeCombobox';
import { Employee } from '@/types/entities';
import { useAppSelector } from '@/store/hooks';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

const emptyForm: EmployeePayload = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: undefined,
  phone: '',
  email: '',
  address: '',
  employeeCode: '',
  joiningDate: '',
  department: '',
  role: '',
  branch: '',
  reportingManager: undefined,
  teamLead: undefined,
  emergencyContact: { name: '', phone: '', relation: '' },
  initialPassword: '',
};

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

export function EmployeeFormModal({ isOpen, onClose, employee }: EmployeeFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(employee);
  const currentUser = useAppSelector((state) => state.auth.employee);
  const isAdmin = Boolean(currentUser?.isAdmin);
  const canResetPassword = Boolean(isEdit && isAdmin && !employee?.isAdmin);

  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState<EmployeePayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Roles/Branches are shared, cached queries - reused from the Roles/Branches pages,
  // so opening this modal after visiting those pages costs zero extra requests.
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: listRoles, staleTime: 5 * 60_000, enabled: isOpen });
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: listBranches,
    staleTime: 5 * 60_000,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (employee) {
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName ?? '',
        dateOfBirth: toDateInput(employee.dateOfBirth),
        gender: employee.gender,
        phone: employee.phone,
        email: employee.email,
        address: employee.address,
        employeeCode: employee.employeeCode ?? '',
        joiningDate: toDateInput(employee.joiningDate),
        department: employee.department ?? '',
        role: typeof employee.role === 'string' ? employee.role : employee.role._id,
        branch: typeof employee.branch === 'string' ? employee.branch : employee.branch._id,
        reportingManager:
          typeof employee.reportingManager === 'string' ? employee.reportingManager : employee.reportingManager?._id,
        teamLead: typeof employee.teamLead === 'string' ? employee.teamLead : employee.teamLead?._id,
        emergencyContact: employee.emergencyContact ?? { name: '', phone: '', relation: '' },
        initialPassword: undefined,
      });
    } else {
      setForm(emptyForm);
    }
    setNewPassword('');
    setErrors({});
  }, [isOpen, employee]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!isEdit) return createEmployee(form);
      const { initialPassword: _ignored, role, ...baseUpdates } = form;
      const updates = isAdmin ? { ...baseUpdates, role } : baseUpdates;
      const updated = await updateEmployee(employee!._id, updates);
      if (canResetPassword && newPassword.trim()) {
        await adminResetEmployeePassword(employee!._id, newPassword);
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
  });

  function set<K extends keyof EmployeePayload>(key: K, value: EmployeePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const result = employeeSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      scrollToFirstError();
      return;
    }
    if (canResetPassword && newPassword.trim()) {
      const passwordResult = passwordField.safeParse(newPassword);
      if (!passwordResult.success) {
        setErrors({ newPassword: passwordResult.error.issues[0]?.message ?? 'Invalid password' });
        scrollToFirstError();
        return;
      }
    }
    setErrors({});
    mutation.mutate();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Employee'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Personal</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="firstName" label="First name" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} />
            <FormField id="lastName" label="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} maxLength={60} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="dob" label="Date of birth" required type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} error={errors.dateOfBirth} />
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" value={form.gender ?? ''} onChange={(e) => set('gender', (e.target.value || undefined) as EmployeePayload['gender'])}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="phone" label="Phone" required value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} inputMode="tel" maxLength={16} />
            <FormField id="employee-email" name="employee-email" autoComplete="off" label="Email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} maxLength={120} />
          </div>
          <FormField id="address" label="Address" required value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} maxLength={250} />
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Employment</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="employeeCode" label="Employee code (optional)" value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} error={errors.employeeCode} maxLength={30} />
            <FormField id="joiningDate" label="Joining date" required type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} error={errors.joiningDate} />
          </div>
          <FormField id="department" label="Department (optional)" value={form.department} onChange={(e) => set('department', e.target.value)} error={errors.department} maxLength={80} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="role" required>Role</Label>
              <Select id="role" hasError={Boolean(errors.role)} value={form.role} onChange={(e) => set('role', e.target.value)} disabled={isEdit && !isAdmin}>
                <option value="">Select role…</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </Select>
              <ErrorText>{errors.role}</ErrorText>
              {isEdit && !isAdmin && <p className="mt-1 text-xs text-faint">Only Admin can change an employee's role.</p>}
            </div>
            <div>
              <Label htmlFor="branch" required>Branch</Label>
              <Select id="branch" hasError={Boolean(errors.branch)} value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <ErrorText>{errors.branch}</ErrorText>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EmployeeCombobox
              label="Reporting manager (optional)"
              value={form.reportingManager}
              initialLabel={
                employee && typeof employee.reportingManager === 'object' && employee.reportingManager
                  ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName ?? ''}`.trim()
                  : undefined
              }
              onChange={(id) => set('reportingManager', id)}
            />
            <EmployeeCombobox
              label="Team lead (optional)"
              value={form.teamLead}
              initialLabel={
                employee && typeof employee.teamLead === 'object' && employee.teamLead
                  ? `${employee.teamLead.firstName} ${employee.teamLead.lastName ?? ''}`.trim()
                  : undefined
              }
              onChange={(id) => set('teamLead', id)}
            />
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Emergency contact (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="emergencyName"
              label="Contact name"
              value={form.emergencyContact?.name ?? ''}
              onChange={(e) => set('emergencyContact', { ...form.emergencyContact, name: e.target.value })}
              error={errors['emergencyContact.name']}
              maxLength={60}
            />
            <FormField
              id="emergencyPhone"
              label="Contact phone"
              value={form.emergencyContact?.phone ?? ''}
              onChange={(e) => set('emergencyContact', { ...form.emergencyContact, phone: e.target.value })}
              error={errors['emergencyContact.phone']}
              inputMode="tel"
              maxLength={16}
            />
          </div>
          <FormField
            id="emergencyRelation"
            label="Relationship"
            value={form.emergencyContact?.relation ?? ''}
            onChange={(e) => set('emergencyContact', { ...form.emergencyContact, relation: e.target.value })}
            error={errors['emergencyContact.relation']}
            maxLength={40}
          />
        </section>

        {canResetPassword && (
          <section className="space-y-3 rounded-xl border border-line bg-muted/30 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">Password reset</p>
              <p className="mt-1 text-xs text-faint">Leave blank to keep the employee's current password.</p>
            </div>
            <FormField
              id="admin-reset-password"
              name="admin-reset-password"
              autoComplete="new-password"
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              maxLength={72}
              error={errors.newPassword}
            />
          </section>
        )}

        {!isEdit && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Account</p>
            <FormField
              id="initialPassword"
              name="new-employee-password"
              autoComplete="new-password"
              label="Initial password"
              required
              type="password"
              value={form.initialPassword}
              onChange={(e) => set('initialPassword', e.target.value)}
              error={errors.initialPassword}
              maxLength={72}
            />
          </section>
        )}

        {mutation.isError && <ErrorText>Failed to save employee. Please check the details and try again.</ErrorText>}
      </div>
    </Modal>
  );
}
