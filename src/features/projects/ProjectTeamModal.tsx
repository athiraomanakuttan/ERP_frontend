import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { IconButton } from '@/components/atoms/IconButton';
import { EmployeeCombobox } from '@/features/employees/EmployeeCombobox';
import { addTeamMember, removeTeamMember } from './projectService';
import { Project, EmployeeRef } from '@/types/entities';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useState } from 'react';

interface ProjectTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export function ProjectTeamModal({ isOpen, onClose, project }: ProjectTeamModalProps) {
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<EmployeeRef | null>(null);

  const addMutation = useMutation({
    mutationFn: (employeeId: string) => addTeamMember(project!._id, employeeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (employeeId: string) => removeTeamMember(project!._id, employeeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  if (!project) return null;

  const members = project.teamMembers.filter((m): m is EmployeeRef => typeof m !== 'string');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Team — ${project.name}`} footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-4">
        <EmployeeCombobox
          label="Add team member"
          value={undefined}
          onChange={(id) => id && addMutation.mutate(id)}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-body">Current members ({members.length})</p>
          {members.length === 0 ? (
            <p className="text-sm text-faint">No team members yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {members.map((m) => (
                <li key={m._id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {m.firstName} {m.lastName ?? ''} <span className="text-faint">— {m.email}</span>
                  </span>
                  <IconButton onClick={() => setRemoving(m)} aria-label="Remove team member">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={Boolean(removing)}
        title="Remove team member"
        message={`Remove ${removing?.firstName ?? ''} ${removing?.lastName ?? ''} from this project? Historical task/work records will be preserved.`}
        confirmLabel="Remove"
        isLoading={removeMutation.isPending}
        onConfirm={() => removing && removeMutation.mutate(removing._id, { onSuccess: () => setRemoving(null) })}
        onCancel={() => setRemoving(null)}
      />
    </Modal>
  );
}
