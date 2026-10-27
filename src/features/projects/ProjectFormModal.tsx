import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { ErrorText } from '@/components/atoms/ErrorText';
import { projectSchema } from './project.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createProject, updateProject, ProjectPayload } from './projectService';
import { listClientCompanies } from '@/features/clientCompanies/clientCompanyService';
import { EmployeeCombobox } from '@/features/employees/EmployeeCombobox';
import { Project } from '@/types/entities';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  canAssign?: boolean;
}

const emptyForm: ProjectPayload = {
  name: '',
  clientCompany: '',
  description: '',
  startDate: '',
  endDate: '',
  status: 'planned',
  priority: 'medium',
  projectManager: undefined,
  notes: '',
};

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

export function ProjectFormModal({ isOpen, onClose, project, canAssign = false }: ProjectFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(project);

  const [form, setForm] = useState<ProjectPayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cached client-company list (active companies, capped at 100) reused across every open of this modal.
  const { data: clientCompanyPage } = useQuery({
    queryKey: ['client-companies-picker'],
    queryFn: () => listClientCompanies({ limit: 100, status: 'active' }),
    staleTime: 5 * 60_000,
    enabled: isOpen,
  });
  const clientCompanies = clientCompanyPage?.items ?? [];

  useEffect(() => {
    if (!isOpen) return;
    if (project) {
      setForm({
        name: project.name,
        clientCompany: typeof project.clientCompany === 'string' ? project.clientCompany : project.clientCompany._id,
        description: project.description ?? '',
        startDate: toDateInput(project.startDate),
        endDate: toDateInput(project.endDate),
        status: project.status,
        priority: project.priority,
        projectManager:
          typeof project.projectManager === 'string' ? project.projectManager : project.projectManager?._id,
        notes: project.notes ?? '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [isOpen, project]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = canAssign ? form : { ...form, projectManager: undefined };
      return isEdit ? updateProject(project!._id, payload) : createProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  function set<K extends keyof ProjectPayload>(key: K, value: ProjectPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const result = projectSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      scrollToFirstError();
      return;
    }
    setErrors({});
    mutation.mutate();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'Add Project'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="name" label="Project name" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />

        <div>
          <Label htmlFor="clientCompany" required>Client company</Label>
          <Select id="clientCompany" hasError={Boolean(errors.clientCompany)} value={form.clientCompany} onChange={(e) => set('clientCompany', e.target.value)}>
            <option value="">Select client company…</option>
            {clientCompanies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName}
              </option>
            ))}
          </Select>
          <ErrorText>{errors.clientCompany}</ErrorText>
        </div>

        <FormField id="description" label="Description (optional)" value={form.description} onChange={(e) => set('description', e.target.value)} error={errors.description} maxLength={1500} />

        <div className="grid grid-cols-2 gap-3">
          <FormField id="startDate" label="Start date (optional)" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
          <FormField id="endDate" label="End date (optional)" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="status" required>Status</Label>
            <Select id="status" value={form.status} onChange={(e) => set('status', e.target.value as ProjectPayload['status'])}>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority" required>Priority</Label>
            <Select id="priority" value={form.priority} onChange={(e) => set('priority', e.target.value as ProjectPayload['priority'])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </div>

        {canAssign ? (
          <EmployeeCombobox
            label="Project manager (optional)"
            value={form.projectManager}
            initialLabel={
              project && typeof project.projectManager === 'object' && project.projectManager
                ? `${project.projectManager.firstName} ${project.projectManager.lastName ?? ''}`.trim()
                : undefined
            }
            onChange={(id) => set('projectManager', id)}
          />
        ) : (
          <p className="rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs text-faint">
            Project manager assignment requires Project Assign permission.
          </p>
        )}

        <FormField id="notes" label="Notes (optional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} error={errors.notes} maxLength={1500} />

        {mutation.isError && <ErrorText>Failed to save project. Please try again.</ErrorText>}
        {!isEdit && (
          <p className="text-xs text-faint">
            Team members can be added once the project is created — open it from the list after saving.
          </p>
        )}
      </div>
    </Modal>
  );
}
