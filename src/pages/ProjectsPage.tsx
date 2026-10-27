import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { IconButton } from '@/components/atoms/IconButton';
import { Pencil, Trash2, Plus, Users, Clock3 } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { DataTable, Column } from '@/components/organisms/DataTable';
import { Pagination } from '@/components/molecules/Pagination';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { listProjects, deleteProject, getProjectClientCompanyOptions } from '@/features/projects/projectService';
import { ProjectFormModal } from '@/features/projects/ProjectFormModal';
import { ProjectTeamModal } from '@/features/projects/ProjectTeamModal';
import { Project, ProjectStatus, ClientCompany } from '@/types/entities';
import { useAppSelector } from '@/store/hooks';

const PAGE_SIZE = 10;

const STATUS_TONE: Record<ProjectStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  planned: 'neutral',
  active: 'success',
  on_hold: 'warning',
  completed: 'info',
  cancelled: 'danger',
};

function formatDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.employee);
  const permissions = currentUser?.permissionKeys ?? [];
  const canCreate = Boolean(currentUser?.isAdmin || permissions.includes('projects:create'));
  const canEdit = Boolean(currentUser?.isAdmin || permissions.includes('projects:edit'));
  const canDelete = Boolean(currentUser?.isAdmin || permissions.includes('projects:delete'));
  const canAssign = Boolean(currentUser?.isAdmin || permissions.includes('projects:assign'));
  const canViewProjectWork = Boolean(currentUser?.isAdmin || (permissions.includes('projects:view_all') && permissions.includes('tasks:view_all')));
  const canOpenProjectDetails = canViewProjectWork;
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ProjectStatus>('');
  const [clientCompanyFilter, setClientCompanyFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [managingTeamId, setManagingTeamId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const listParams = { page, limit: PAGE_SIZE, search: debouncedSearch || undefined, status: statusFilter || undefined, clientCompany: clientCompanyFilter || undefined };

  const { data: clientCompanyOptions = [] } = useQuery({
    queryKey: ['project-client-company-filter-options'],
    queryFn: getProjectClientCompanyOptions,
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['projects', listParams],
    queryFn: () => listProjects(listParams),
    placeholderData: keepPreviousData,
  });

  const projects = data?.items ?? [];
  // Derive the team-modal's project from the live list so add/remove reflects immediately after refetch.
  const managingProject = projects.find((p) => p._id === managingTeamId) ?? null;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleting(null);
    },
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  function clientCompanyName(cc: ClientCompany | string) {
    return typeof cc === 'string' ? cc : cc.companyName;
  }

  const columns: Column<Project>[] = [
    { header: 'Project', render: (p) => canOpenProjectDetails ? (
      <button type="button" onClick={() => navigate(`/projects/${p._id}`)} className="font-medium text-heading hover:text-primary-600 hover:underline dark:hover:text-primary-400">{p.name}</button>
    ) : <span className="font-medium text-heading">{p.name}</span> },
    { header: 'Client', render: (p) => clientCompanyName(p.clientCompany) },
    { header: 'Status', render: (p) => <Badge tone={STATUS_TONE[p.status]}>{p.status.replace('_', ' ')}</Badge> },
    { header: 'Priority', render: (p) => <Badge>{p.priority}</Badge> },
    { header: 'Team', render: (p) => `${p.teamMembers.length} member${p.teamMembers.length === 1 ? '' : 's'}` },
    ...(canViewProjectWork ? [{
      header: 'Worked Time',
      render: (p: Project) => (
        <button
          type="button"
          onClick={() => navigate(`/projects/${p._id}`)}
          className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline dark:text-primary-400"
          title="Open project work summary"
        >
          <Clock3 className="h-3.5 w-3.5" />
          {formatDuration(p.totalWorkedSeconds ?? 0)}
        </button>
      ),
    } as Column<Project>] : []),
    {
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          {canAssign && <Button variant="ghost" size="sm" onClick={() => setManagingTeamId(p._id)}>
            <Users className="h-3.5 w-3.5" />
            Team
          </Button>}
          {canEdit && <IconButton onClick={() => { setEditing(p); setModalOpen(true); }} aria-label="Edit project">
            <Pencil className="h-4 w-4" />
          </IconButton>}
          {canDelete && <IconButton onClick={() => setDeleting(p)} aria-label="Delete project">
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
            placeholder="Search project name…"
            value={searchInput}
            onChange={(e) => resetToFirstPage(setSearchInput)(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onChange={(e) => resetToFirstPage(setStatusFilter)(e.target.value as '' | ProjectStatus)} className="w-40">
            <option value="">All statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select value={clientCompanyFilter} onChange={(e) => resetToFirstPage(setClientCompanyFilter)(e.target.value)} className="w-52">
            <option value="">All client companies</option>
            {clientCompanyOptions.map((company) => (
              <option key={company._id} value={company._id}>{company.companyName}</option>
            ))}
          </Select>
        </div>
        {canCreate && <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" />Add Project</Button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <DataTable columns={columns} rows={projects} isLoading={isLoading} rowKey={(p) => p._id} emptyLabel="No projects match your filters" />
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={PAGE_SIZE} onPageChange={setPage} />
      </div>
      {isFetching && !isLoading && <p className="text-xs text-faint">Refreshing…</p>}

      <ProjectFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} project={editing} canAssign={canAssign} />
      <ProjectTeamModal isOpen={Boolean(managingTeamId)} onClose={() => setManagingTeamId(null)} project={managingProject} />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete project"
        message={`Delete "${deleting?.name}"? Its tasks and history are preserved but the project will no longer be listed.`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting._id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
