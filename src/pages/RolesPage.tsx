import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { listRoles, deleteRole } from '@/features/roles/roleService';
import { RoleFormModal } from '@/features/roles/RoleFormModal';
import { Role } from '@/types/entities';

export function RolesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: listRoles });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
    },
  });

  const columns: Column<Role>[] = [
    { header: 'Name', render: (r) => <span className="font-medium text-heading">{r.name}</span> },
    { header: 'Description', render: (r) => r.description ?? '—' },
    {
      header: 'Permissions',
      render: (r) => <Badge tone="info">{Array.isArray(r.permissions) ? r.permissions.length : 0} assigned</Badge>,
    },
    { header: 'Type', render: (r) => (r.isSystemRole ? <Badge tone="warning">System</Badge> : <Badge>Custom</Badge>) },
    {
      header: '',
      className: 'text-right',
      render: (r) =>
        r.isSystemRole ? null : (
          <div className="flex justify-end gap-1">
            <IconButton onClick={() => { setEditingRole(r); setModalOpen(true); }} aria-label="Edit role">
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={() => setDeletingRole(r)} aria-label="Delete role">
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-subtle">Define roles and the permissions each one grants.</p>
        <Button onClick={() => { setEditingRole(null); setModalOpen(true); }}><Plus className="h-4 w-4" />New Role</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <DataTable columns={columns} rows={roles} isLoading={isLoading} rowKey={(r) => r._id} emptyLabel="No roles yet" />
      </div>

      <RoleFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} role={editingRole} />

      <ConfirmDialog
        isOpen={Boolean(deletingRole)}
        title="Delete role"
        message={`Delete "${deletingRole?.name}"? Employees currently assigned this role will need a new one.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingRole && deleteMutation.mutate(deletingRole._id)}
        onCancel={() => setDeletingRole(null)}
      />
    </div>
  );
}
