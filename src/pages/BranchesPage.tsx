import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { listBranches, deleteBranch } from '@/features/branches/branchService';
import { BranchFormModal } from '@/features/branches/BranchFormModal';
import { Branch } from '@/types/entities';

export function BranchesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({ queryKey: ['branches'], queryFn: listBranches });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeletingBranch(null);
    },
  });

  const columns: Column<Branch>[] = [
    { header: 'Name', render: (b) => <span className="font-medium text-heading">{b.name}</span> },
    { header: 'Timezone', render: (b) => b.timezone },
    { header: 'Working hours', render: (b) => `${b.workingStartTime} – ${b.workingEndTime}` },
    {
      header: 'Working days',
      render: (b) => (
        <div className="flex flex-wrap gap-1">
          {b.workingDays
            .filter((d) => d.isWorking)
            .map((d) => (
              <Badge key={d.day}>{d.day.slice(0, 3)}</Badge>
            ))}
        </div>
      ),
    },
    {
      header: '',
      className: 'text-right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          <IconButton onClick={() => { setEditingBranch(b); setModalOpen(true); }} aria-label="Edit branch">
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={() => setDeletingBranch(b)} aria-label="Delete branch">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-subtle">Manage office locations, timezones, and working hours.</p>
        <Button onClick={() => { setEditingBranch(null); setModalOpen(true); }}><Plus className="h-4 w-4" />New Branch</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <DataTable columns={columns} rows={branches} isLoading={isLoading} rowKey={(b) => b._id} emptyLabel="No branches yet" />
      </div>

      <BranchFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} branch={editingBranch} />

      <ConfirmDialog
        isOpen={Boolean(deletingBranch)}
        title="Delete branch"
        message={`Delete "${deletingBranch?.name}"? Employees assigned to this branch will need to be reassigned.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingBranch && deleteMutation.mutate(deletingBranch._id)}
        onCancel={() => setDeletingBranch(null)}
      />
    </div>
  );
}
