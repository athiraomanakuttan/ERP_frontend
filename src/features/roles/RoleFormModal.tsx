import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Checkbox } from '@/components/atoms/Checkbox';
import { ErrorText } from '@/components/atoms/ErrorText';
import { roleSchema } from './role.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createRole, updateRole, listPermissions } from './roleService';
import { Permission, Role } from '@/types/entities';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: Role | null;
}

export function RoleFormModal({ isOpen, onClose, role }: RoleFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(role);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: listPermissions,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setSelectedPermissions(
      role?.permissions?.map((p) => (typeof p === 'string' ? p : p._id)) ?? []
    );
    setErrors({});
  }, [isOpen, role]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions) {
      groups[p.module] ??= [];
      groups[p.module].push(p);
    }
    return groups;
  }, [permissions]);

  const scopedModules = ['employees', 'projects', 'tasks'] as const;
  type ScopedModule = (typeof scopedModules)[number];
  type Visibility = 'none' | 'assigned' | 'all';

  const scopePermissions = useMemo(() => {
    const result = {} as Record<ScopedModule, { legacy?: Permission; assigned?: Permission; all?: Permission }>;
    for (const module of scopedModules) {
      const modulePermissions = groupedPermissions[module] ?? [];
      result[module] = {
        legacy: modulePermissions.find((p) => p.key === `${module}:view`),
        assigned: modulePermissions.find((p) => p.key === `${module}:view_assigned`),
        all: modulePermissions.find((p) => p.key === `${module}:view_all`),
      };
    }
    return result;
  }, [groupedPermissions]);

  function visibilityFor(module: ScopedModule): Visibility {
    const scopes = scopePermissions[module];
    if (scopes.all && selectedPermissions.includes(scopes.all._id)) return 'all';
    if (
      (scopes.assigned && selectedPermissions.includes(scopes.assigned._id)) ||
      (scopes.legacy && selectedPermissions.includes(scopes.legacy._id))
    ) return 'assigned';
    return 'none';
  }

  function setVisibility(module: ScopedModule, scope: Visibility) {
    setSelectedPermissions((prev) => {
      const scopes = scopePermissions[module];
      const scopeIds = [scopes.legacy?._id, scopes.assigned?._id, scopes.all?._id].filter(Boolean) as string[];
      const next = prev.filter((id) => !scopeIds.includes(id));
      if (scope === 'assigned') {
        if (scopes.assigned) next.push(scopes.assigned._id);
        else if (scopes.legacy) next.push(scopes.legacy._id);
      }
      if (scope === 'all' && scopes.all) next.push(scopes.all._id);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, description, permissions: selectedPermissions };
      return isEdit ? updateRole(role!._id, payload) : createRole(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
  });

  function togglePermission(id: string) {
    setSelectedPermissions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function handleSubmit() {
    const result = roleSchema.safeParse({ name, description, permissions: selectedPermissions });
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
      title={isEdit ? 'Edit Role' : 'Create Role'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="role-name" label="Role name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <FormField
          id="role-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
          maxLength={500}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-body">Permissions</p>
          <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border border-line p-3">
            {Object.entries(groupedPermissions).length === 0 && (
              <p className="text-sm text-faint">No permissions found. Seed the backend first.</p>
            )}

            {Object.entries(groupedPermissions).map(([module, perms]) => {
              const isScopedModule = scopedModules.includes(module as ScopedModule);
              const scopedModule = module as ScopedModule;
              const actionPerms = isScopedModule
                ? perms.filter((p) => !['view', 'view_assigned', 'view_all'].includes(p.action))
                : perms;

              return (
                <div key={module} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">{module}</p>

                  {isScopedModule && (scopePermissions[scopedModule].legacy || scopePermissions[scopedModule].assigned || scopePermissions[scopedModule].all) && (
                    <div className="rounded-lg border border-line bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-semibold capitalize text-heading">{module} visibility</p>
                      <div className="space-y-2 text-sm text-body">
                        <label className="flex cursor-pointer items-start gap-2">
                          <input type="radio" name={`${module}-visibility`} checked={visibilityFor(scopedModule) === 'none'} onChange={() => setVisibility(scopedModule, 'none')} />
                          <span><strong>None</strong><br /><span className="text-xs text-faint">No access to {module} records.</span></span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-2">
                          <input type="radio" name={`${module}-visibility`} checked={visibilityFor(scopedModule) === 'assigned'} onChange={() => setVisibility(scopedModule, 'assigned')} />
                          <span><strong>Assigned / related only</strong><br /><span className="text-xs text-faint">{module === 'employees' ? 'Employees where this user is Reporting Manager or Team Lead.' : module === 'projects' ? 'Projects managed by, assigned to, or created by this user.' : 'Tasks assigned to, awaiting approval by, created by, or belonging to a project this user manages/created.'}</span></span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-2">
                          <input type="radio" name={`${module}-visibility`} checked={visibilityFor(scopedModule) === 'all'} onChange={() => setVisibility(scopedModule, 'all')} />
                          <span><strong>All {module}</strong><br /><span className="text-xs text-faint">View every {module === 'employees' ? 'normal employee (Admin remains protected)' : module} record.</span></span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1">
                    {actionPerms.map((p) => (
                      <Checkbox
                        key={p._id}
                        id={p._id}
                        label={p.action}
                        checked={selectedPermissions.includes(p._id)}
                        onChange={() => togglePermission(p._id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-faint">
            Employee, Project and Task action permissions only work inside the selected visibility scope. Admin accounts are never exposed to non-admin employee roles.
          </p>
        </div>

        {mutation.isError && <ErrorText>Failed to save role. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
