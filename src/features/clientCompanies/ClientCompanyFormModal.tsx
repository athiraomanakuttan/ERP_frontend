import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { ErrorText } from '@/components/atoms/ErrorText';
import { clientCompanySchema } from './clientCompany.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createClientCompany, updateClientCompany, ClientCompanyPayload } from './clientCompanyService';
import { ClientCompany } from '@/types/entities';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';

interface ClientCompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientCompany?: ClientCompany | null;
}

const emptyForm: ClientCompanyPayload = { companyName: '', contactPerson: '', phone: '', status: 'active', notes: '' };

export function ClientCompanyFormModal({ isOpen, onClose, clientCompany }: ClientCompanyFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(clientCompany);

  const [form, setForm] = useState<ClientCompanyPayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      clientCompany
        ? {
            companyName: clientCompany.companyName,
            contactPerson: clientCompany.contactPerson ?? '',
            phone: clientCompany.phone ?? '',
            status: clientCompany.status,
            notes: clientCompany.notes ?? '',
          }
        : emptyForm
    );
    setErrors({});
    setConfirmDeactivate(false);
  }, [isOpen, clientCompany]);

  const mutation = useMutation({
    mutationFn: () => (isEdit ? updateClientCompany(clientCompany!._id, form) : createClientCompany(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-companies'] });
      queryClient.invalidateQueries({ queryKey: ['client-companies-picker'] });
      onClose();
    },
  });

  function set<K extends keyof ClientCompanyPayload>(key: K, value: ClientCompanyPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const result = clientCompanySchema.safeParse(form);
    if (!result.success) {
      setErrors(zodFieldErrors(result.error));
      scrollToFirstError();
      return;
    }
    setErrors({});
    if (isEdit && clientCompany?.status === 'active' && form.status === 'inactive') {
      setConfirmDeactivate(true);
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Client Company' : 'Add Client Company'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="companyName" label="Company name" required value={form.companyName} onChange={(e) => set('companyName', e.target.value)} error={errors.companyName} />
        <div className="grid grid-cols-2 gap-3">
          <FormField id="contactPerson" label="Contact person (optional)" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} error={errors.contactPerson} maxLength={60} />
          <FormField id="phone" label="Phone (optional)" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} inputMode="tel" maxLength={16} />
        </div>
        <div>
          <Label htmlFor="status" required>Status</Label>
          <Select id="status" value={form.status} onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <FormField id="notes" label="Notes (optional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} error={errors.notes} maxLength={1000} />
        {mutation.isError && <ErrorText>Failed to save client company. Please try again.</ErrorText>}
      </div>
      <ConfirmDialog
        isOpen={confirmDeactivate}
        title="Deactivate client company"
        message={`Deactivate \"${clientCompany?.companyName ?? form.companyName}\"? It will remain in historical records but will no longer be active.`}
        confirmLabel="Deactivate"
        isLoading={mutation.isPending}
        onConfirm={() => { setConfirmDeactivate(false); mutation.mutate(); }}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </Modal>
  );
}
