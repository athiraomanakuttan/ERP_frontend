import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { Pagination } from '@/components/molecules/Pagination';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { listClientCompanies, deleteClientCompany } from '@/features/clientCompanies/clientCompanyService';
import { ClientCompanyFormModal } from '@/features/clientCompanies/ClientCompanyFormModal';
import { ClientCompany } from '@/types/entities';
import { useAppSelector } from '@/store/hooks';

const PAGE_SIZE = 10;

export function ClientCompaniesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAppSelector((state) => state.auth.employee);
  const permissions = currentUser?.permissionKeys ?? [];
  const canCreate = Boolean(currentUser?.isAdmin || permissions.includes('client-companies:create'));
  const canEdit = Boolean(currentUser?.isAdmin || permissions.includes('client-companies:edit'));
  const canDelete = Boolean(currentUser?.isAdmin || permissions.includes('client-companies:delete'));
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientCompany | null>(null);
  const [deleting, setDeleting] = useState<ClientCompany | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const listParams = { page, limit: PAGE_SIZE, search: debouncedSearch || undefined, status: statusFilter || undefined };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['client-companies', listParams],
    queryFn: () => listClientCompanies(listParams),
    placeholderData: keepPreviousData,
  });

  const companies = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClientCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-companies'] });
      setDeleting(null);
    },
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const columns: Column<ClientCompany>[] = [
    { header: 'Company', render: (c) => <span className="font-medium text-heading">{c.companyName}</span> },
    { header: 'Contact person', render: (c) => c.contactPerson ?? '—' },
    { header: 'Phone', render: (c) => c.phone ?? '—' },
    { header: 'Status', render: (c) => <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</Badge> },
    {
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          {canEdit && <IconButton onClick={() => { setEditing(c); setModalOpen(true); }} aria-label="Edit client company">
            <Pencil className="h-4 w-4" />
          </IconButton>}
          {canDelete && <IconButton onClick={() => setDeleting(c)} aria-label="Delete client company">
            <Trash2 className="h-4 w-4" />
          </IconButton>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search company name…"
            value={searchInput}
            onChange={(e) => resetToFirstPage(setSearchInput)(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onChange={(e) => resetToFirstPage(setStatusFilter)(e.target.value as '' | 'active' | 'inactive')} className="w-36">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        {canCreate && <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" />Add Client Company</Button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <DataTable columns={columns} rows={companies} isLoading={isLoading} rowKey={(c) => c._id} emptyLabel="No client companies match your filters" />
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={PAGE_SIZE} onPageChange={setPage} />
      </div>
      {isFetching && !isLoading && <p className="text-xs text-faint">Refreshing…</p>}

      <ClientCompanyFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} clientCompany={editing} />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete client company"
        message={`Delete "${deleting?.companyName}"? Existing projects linked to it will keep their history.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting._id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
