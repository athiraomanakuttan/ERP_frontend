import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { Checkbox } from '@/components/atoms/Checkbox';
import { ErrorText } from '@/components/atoms/ErrorText';
import { taskSchema } from './task.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createTask, updateTask, TaskPayload } from './taskService';
import { listProjects } from '@/features/projects/projectService';
import { Task, EmployeeRef } from '@/types/entities';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultProjectId?: string;
  canAssign?: boolean;
  currentEmployeeId?: string;
}

const emptyForm: TaskPayload = {
  title: '',
  description: '',
  project: '',
  assignees: [],
  priority: 'medium',
  dueDate: '',
};

export function TaskFormModal({ isOpen, onClose, task, defaultProjectId, canAssign = true, currentEmployeeId }: TaskFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(task);

  const [form, setForm] = useState<TaskPayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reuses the same cached projects-picker query as the Task list's project filter -
  // team members come pre-populated on each project, so no extra request is needed
  // to know who's eligible for assignment (spec section 8: assignment requires project membership).
  const { data: projectPage } = useQuery({
    queryKey: ['projects-picker'],
    queryFn: () => listProjects({ limit: 100 }),
    staleTime: 2 * 60_000,
    enabled: isOpen,
  });
  const projects = projectPage?.items ?? [];

  const selectedProject = projects.find((p) => p._id === form.project);
  const eligibleMembers: EmployeeRef[] = useMemo(
    () => (selectedProject?.teamMembers.filter((m): m is EmployeeRef => typeof m !== 'string') ?? []),
    [selectedProject]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        project: typeof task.project === 'string' ? task.project : task.project._id,
        assignees: task.assignees.map((a) => (typeof a === 'string' ? a : a._id)),
        priority: task.priority,
        dueDate: task.dueDate?.slice(0, 10) ?? '',
      });
    } else {
      const defaultProject = projects.find((p) => p._id === defaultProjectId);
      const defaultMemberIds = defaultProject?.teamMembers.map((m) => (typeof m === 'string' ? m : m._id)) ?? [];
      const defaultAssignees = !canAssign && currentEmployeeId && defaultMemberIds.includes(currentEmployeeId) ? [currentEmployeeId] : [];
      setForm({ ...emptyForm, project: defaultProjectId ?? '', assignees: defaultAssignees });
    }
    setErrors({});
  }, [isOpen, task, defaultProjectId, canAssign, currentEmployeeId, projects]);

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit && !canAssign) {
        const { assignees: _assignees, ...editableFields } = form;
        return updateTask(task!._id, editableFields);
      }
      return isEdit ? updateTask(task!._id, form) : createTask(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  function set<K extends keyof TaskPayload>(key: K, value: TaskPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAssignee(id: string) {
    if (!canAssign) {
      if (isEdit) return;
      if (id !== currentEmployeeId) return;
      setForm((prev) => ({ ...prev, assignees: [id] }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(id) ? prev.assignees.filter((a) => a !== id) : [...prev.assignees, id],
    }));
  }

  function handleProjectChange(projectId: string) {
    const project = projects.find((p) => p._id === projectId);
    const memberIds = project?.teamMembers.map((m) => (typeof m === 'string' ? m : m._id)) ?? [];
    const selfAssignees = !canAssign && currentEmployeeId && memberIds.includes(currentEmployeeId) ? [currentEmployeeId] : [];
    // Without Task Assign permission, creation is limited to a self-assigned task.
    setForm((prev) => ({ ...prev, project: projectId, assignees: selfAssignees }));
  }

  function handleSubmit() {
    const result = taskSchema.safeParse(form);
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
      title={isEdit ? 'Edit Task' : 'Add Task'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="title" label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <FormField id="description" label="Description (optional)" value={form.description} onChange={(e) => set('description', e.target.value)} error={errors.description} maxLength={1500} />

        <div>
          <Label htmlFor="project" required>Project</Label>
          <Select id="project" hasError={Boolean(errors.project)} value={form.project} onChange={(e) => handleProjectChange(e.target.value)} disabled={isEdit}>
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <ErrorText>{errors.project}</ErrorText>
          {isEdit && <p className="mt-1 text-xs text-faint">Project can't be changed after a task is created.</p>}
        </div>

        <div>
          <Label required>Assignees</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-line p-3">
            {!form.project ? (
              <p className="text-sm text-faint">Select a project first.</p>
            ) : eligibleMembers.length === 0 ? (
              <p className="text-sm text-faint">This project has no team members yet. Add some from the Projects page.</p>
            ) : (
              eligibleMembers.map((m) => (
                <Checkbox
                  key={m._id}
                  id={`assignee-${m._id}`}
                  label={`${m.firstName} ${m.lastName ?? ''}`.trim()}
                  checked={form.assignees.includes(m._id)}
                  onChange={() => toggleAssignee(m._id)}
                  disabled={!canAssign && (isEdit || m._id !== currentEmployeeId)}
                />
              ))
            )}
          </div>
          {!canAssign && <p className="mt-1 text-xs text-faint">Without Task Assign permission, you can only create a task assigned to yourself and cannot change assignees while editing.</p>}
          <ErrorText>{errors.assignees}</ErrorText>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="priority" required>Priority</Label>
            <Select id="priority" value={form.priority} onChange={(e) => set('priority', e.target.value as TaskPayload['priority'])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
          <FormField id="dueDate" label="Due date (optional)" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} error={errors.dueDate} />
        </div>

        {mutation.isError && <ErrorText>Failed to save task. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
