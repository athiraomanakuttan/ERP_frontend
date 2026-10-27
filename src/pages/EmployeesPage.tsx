import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus, Play, Pause, Search, X } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { Pagination } from '@/components/molecules/Pagination';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { listEmployees, deleteEmployee, setEmployeeStatus } from '@/features/employees/employeeService';
import { EmployeeFormModal } from '@/features/employees/EmployeeFormModal';
import { listRoles } from '@/features/roles/roleService';
import { listBranches } from '@/features/branches/branchService';
import { Employee, Role, Branch } from '@/types/entities';
import { useAppSelector } from '@/store/hooks';

const PAGE_SIZE = 10;

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAppSelector((s) => s.auth.employee);
  const permissionKeys = currentUser?.permissionKeys ?? [];
  const canCreate = Boolean(currentUser?.isAdmin || permissionKeys.includes('employees:create'));
  const canEdit = Boolean(currentUser?.isAdmin || permissionKeys.includes('employees:edit'));
  const canDelete = Boolean(currentUser?.isAdmin || permissionKeys.includes('employees:delete'));

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);

  // Debounce search so we don't hit the API on every keystroke.
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  // Filter dropdowns reuse the same cached queries as the Roles/Branches pages.
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: listRoles, staleTime: 5 * 60_000 });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: listBranches, staleTime: 5 * 60_000 });

  const listParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    branch: branchFilter || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  };

  // keepPreviousData: paginating/filtering keeps the old page on screen (no flash of
  // loading state) while the new page fetches in the background.
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['employees', listParams],
    queryFn: () => listEmployees(listParams),
    placeholderData: keepPreviousData,
  });

  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => setEmployeeStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeletingEmployee(null);
    },
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  function roleName(role: Role | string) {
    if (typeof role === 'string') return roles.find((r) => r._id === role)?.name ?? '—';
    return role.name;
  }
  function branchName(branch: Branch | string) {
    if (typeof branch === 'string') return branches.find((b) => b._id === branch)?.name ?? '—';
    return branch.name;
  }

  const columns: Column<Employee>[] = [
    {
      header: 'Name',
      render: (e) => (
        <div>
          <p className="font-medium text-heading">
            {e.firstName} {e.lastName ?? ''}
          </p>
          <p className="text-xs text-faint">{e.email}</p>
        </div>
      ),
    },
    { header: 'Role', render: (e) => roleName(e.role) },
    { header: 'Branch', render: (e) => branchName(e.branch) },
    { header: 'Department', render: (e) => e.department ?? '—' },
    {
      header: 'Status',
      render: (e) => <Badge tone={e.status === 'active' ? 'success' : 'neutral'}>{e.status}</Badge>,
    },
    {
      header: '',
      className: 'text-right',
      render: (e) => {
        const isProtectedAdmin = Boolean(e.isAdmin && !currentUser?.isAdmin);
        const isSelf = e._id === currentUser?.id;
        if (isProtectedAdmin || (!canEdit && !canDelete)) return null;
        return (
          <div className="flex justify-end gap-1">
            {canEdit && (
              <>
                <IconButton onClick={() => { setEditingEmployee(e); setModalOpen(true); }} aria-label="Edit employee">
                  <Pencil className="h-4 w-4" />
                </IconButton>
                {!isSelf && (
                  <IconButton
                    onClick={() => e.status === 'active' ? setDeactivatingEmployee(e) : statusMutation.mutate({ id: e._id, status: 'active' })}
                    aria-label={e.status === 'active' ? 'Deactivate employee' : 'Activate employee'}
                  >
                    {e.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </IconButton>
                )}
              </>
            )}
            {canDelete && !isSelf && (
              <IconButton onClick={() => setDeletingEmployee(e)} aria-label="Delete employee">
                <Trash2 className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-heading">Employee directory</p>
            <p className="text-xs text-faint">Search and refine employees without losing your current page context.</p>
          </div>
          {canCreate && (
            <Button onClick={() => { setEditingEmployee(null); setModalOpen(true); }}><Plus className="h-4 w-4" />Add Employee</Button>
          )}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              type="search"
              name="employee-directory-search"
              autoComplete="off"
              placeholder="Search name, email or employee code…"
              value={searchInput}
              onChange={(e) => resetToFirstPage(setSearchInput)(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={branchFilter} onChange={(e) => resetToFirstPage(setBranchFilter)(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Select>
          <Select value={roleFilter} onChange={(e) => resetToFirstPage(setRoleFilter)(e.target.value)}>
            <option value="">All roles</option>
            {roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => resetToFirstPage(setStatusFilter)(e.target.value as '' | 'active' | 'inactive')}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          {(searchInput || branchFilter || roleFilter || statusFilter) && (
            <Button variant="ghost" onClick={() => { setSearchInput(''); setBranchFilter(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}>
              <X className="h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <DataTable columns={columns} rows={employees} isLoading={isLoading} rowKey={(e) => e._id} emptyLabel="No employees match your filters" />
        <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} onPageChange={setPage} />
      </div>
      {isFetching && !isLoading && <p className="text-xs text-faint">Refreshing…</p>}

      <EmployeeFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} employee={editingEmployee} />


      <ConfirmDialog
        isOpen={Boolean(deactivatingEmployee)}
        title="Deactivate employee"
        message={`Deactivate ${deactivatingEmployee?.firstName} ${deactivatingEmployee?.lastName ?? ''}? They will no longer be able to log in until reactivated.`}
        confirmLabel="Deactivate"
        isLoading={statusMutation.isPending}
        onConfirm={() => {
          if (!deactivatingEmployee) return;
          statusMutation.mutate(
            { id: deactivatingEmployee._id, status: 'inactive' },
            { onSuccess: () => setDeactivatingEmployee(null) }
          );
        }}
        onCancel={() => setDeactivatingEmployee(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingEmployee)}
        title="Remove employee"
        message={`Remove ${deletingEmployee?.firstName} ${deletingEmployee?.lastName ?? ''}? Their historical records (attendance, tasks, leave) are preserved.`}
        confirmLabel="Remove"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingEmployee && deleteMutation.mutate(deletingEmployee._id)}
        onCancel={() => setDeletingEmployee(null)}
      />
    </div>
  );
}
