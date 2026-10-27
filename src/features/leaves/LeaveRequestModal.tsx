import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { ErrorText } from '@/components/atoms/ErrorText';
import { leaveRequestSchema } from './leaveRequest.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createLeaveRequest, listLeaveTypes, LeaveRequestPayload } from './leaveService';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptyForm: LeaveRequestPayload = { leaveType: '', startDate: '', endDate: '', reason: '' };

export function LeaveRequestModal({ isOpen, onClose }: LeaveRequestModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LeaveRequestPayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: leaveTypes = [] } = useQuery({ queryKey: ['leave-types'], queryFn: listLeaveTypes, staleTime: 5 * 60_000, enabled: isOpen });

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: () => createLeaveRequest(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests-mine'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance-me'] });
      onClose();
    },
  });

  function set<K extends keyof LeaveRequestPayload>(key: K, value: LeaveRequestPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const result = leaveRequestSchema.safeParse(form);
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
      title="Request Leave"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            Submit Request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="leaveType" required>Leave type</Label>
          <Select id="leaveType" hasError={Boolean(errors.leaveType)} value={form.leaveType} onChange={(e) => set('leaveType', e.target.value)}>
            <option value="">Select leave type…</option>
            {leaveTypes.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
          <ErrorText>{errors.leaveType}</ErrorText>
          {leaveTypes.length === 0 && <p className="mt-1 text-xs text-faint">No leave types yet — ask an Admin to add one.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="startDate" label="Start date" required type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} error={errors.startDate} />
          <FormField id="endDate" label="End date" required type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} error={errors.endDate} />
        </div>
        <FormField id="reason" label="Reason (optional)" value={form.reason} onChange={(e) => set('reason', e.target.value)} error={errors.reason} maxLength={500} />
        {mutation.isError && <ErrorText>{(mutation.error as any)?.response?.data?.message || 'Failed to submit request. Please try again.'}</ErrorText>}
      </div>
    </Modal>
  );
}
