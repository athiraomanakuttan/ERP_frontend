import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { ErrorText } from '@/components/atoms/ErrorText';
import { createLeaveType, updateLeaveType } from './leaveService';
import { leaveTypeSchema } from './leaveType.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { LeaveType } from '@/types/entities';

export function LeaveTypeModal({ isOpen, onClose, leaveType }: { isOpen: boolean; onClose: () => void; leaveType?: LeaveType | null }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [days, setDays] = useState('12');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(leaveType);

  useEffect(() => {
    if (!isOpen) return;
    setName(leaveType?.name ?? '');
    setDays(String(leaveType?.defaultDaysPerYear ?? 12));
    setDescription(leaveType?.description ?? '');
    setErrors({});
  }, [isOpen, leaveType]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, defaultDaysPerYear: Number(days), description };
      return isEdit ? updateLeaveType(leaveType!._id, payload) : createLeaveType(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      onClose();
    },
  });

  function handleSubmit() {
    const result = leaveTypeSchema.safeParse({ name, defaultDaysPerYear: days, description });
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
      title={isEdit ? 'Edit Leave Type' : 'Add Leave Type'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>{isEdit ? 'Save Changes' : 'Create'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="leaveTypeName" label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} />
        <FormField id="defaultDays" label="Default days per year" required type="number" min="0" max="366" value={days} onChange={(e) => setDays(e.target.value)} error={errors.defaultDaysPerYear} />
        <FormField id="leaveTypeDescription" label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} maxLength={500} />
        {mutation.isError && <ErrorText>Failed to save leave type. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
