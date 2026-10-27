import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Checkbox } from '@/components/atoms/Checkbox';
import { ErrorText } from '@/components/atoms/ErrorText';
import { holidaySchema } from './holiday.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createHoliday, updateHoliday, HolidayPayload } from './holidayService';
import { listBranches } from '@/features/branches/branchService';
import { Holiday, Branch } from '@/types/entities';

interface HolidayFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  holiday?: Holiday | null;
}

const emptyForm: HolidayPayload = { name: '', date: '', branches: [] };

export function HolidayFormModal({ isOpen, onClose, holiday }: HolidayFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(holiday);

  const [form, setForm] = useState<HolidayPayload>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: listBranches, staleTime: 5 * 60_000, enabled: isOpen });

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      holiday
        ? {
            name: holiday.name,
            date: holiday.date.slice(0, 10),
            branches: holiday.branches.map((b) => (typeof b === 'string' ? b : (b as Branch)._id)),
          }
        : emptyForm
    );
    setErrors({});
  }, [isOpen, holiday]);

  const mutation = useMutation({
    mutationFn: () => (isEdit ? updateHoliday(holiday!._id, form) : createHoliday(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      onClose();
    },
  });

  function toggleBranch(id: string) {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.includes(id) ? prev.branches.filter((b) => b !== id) : [...prev.branches, id],
    }));
  }

  function handleSubmit() {
    const result = holidaySchema.safeParse(form);
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
      title={isEdit ? 'Edit Holiday' : 'Add Holiday'}
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
        <FormField id="holidayName" label="Holiday name" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} error={errors.name} />
        <FormField id="holidayDate" label="Date" required type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} error={errors.date} />
        <div>
          <Label required>Applies to branches</Label>
          <div className="space-y-1 rounded-md border border-line p-3">
            {branches.length === 0 ? (
              <p className="text-sm text-faint">No branches yet.</p>
            ) : (
              branches.map((b) => (
                <Checkbox
                  key={b._id}
                  id={`holiday-branch-${b._id}`}
                  label={b.name}
                  checked={form.branches.includes(b._id)}
                  onChange={() => toggleBranch(b._id)}
                />
              ))
            )}
          </div>
          <ErrorText>{errors.branches}</ErrorText>
        </div>
        {mutation.isError && <ErrorText>Failed to save holiday. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
