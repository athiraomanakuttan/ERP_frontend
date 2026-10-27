import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { Checkbox } from '@/components/atoms/Checkbox';
import { ErrorText } from '@/components/atoms/ErrorText';
import { branchSchema, defaultWorkingDays, DAYS } from './branch.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';
import { createBranch, updateBranch } from './branchService';
import { Branch, WorkingDay } from '@/types/entities';

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India — Asia/Kolkata' },
  { value: 'Asia/Dubai', label: 'UAE — Asia/Dubai' },
  { value: 'Asia/Muscat', label: 'Oman — Asia/Muscat' },
  { value: 'Asia/Singapore', label: 'Singapore — Asia/Singapore' },
  { value: 'Europe/London', label: 'United Kingdom — Europe/London' },
  { value: 'Europe/Berlin', label: 'Central Europe — Europe/Berlin' },
  { value: 'America/New_York', label: 'US Eastern — America/New_York' },
  { value: 'America/Los_Angeles', label: 'US Pacific — America/Los_Angeles' },
  { value: 'Australia/Sydney', label: 'Australia — Australia/Sydney' },
  { value: 'UTC', label: 'UTC' },
];

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch?: Branch | null;
}

export function BranchFormModal({ isOpen, onClose, branch }: BranchFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(branch);

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>(defaultWorkingDays());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setName(branch?.name ?? '');
    setTimezone(branch?.timezone ?? 'Asia/Kolkata');
    setWorkingDays(branch?.workingDays ?? defaultWorkingDays());
    setStartTime(branch?.workingStartTime ?? '09:00');
    setEndTime(branch?.workingEndTime ?? '18:00');
    setErrors({});
  }, [isOpen, branch]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, timezone, workingDays, workingStartTime: startTime, workingEndTime: endTime };
      return isEdit ? updateBranch(branch!._id, payload) : createBranch(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      onClose();
    },
  });

  function toggleDay(day: (typeof DAYS)[number]) {
    setWorkingDays((prev) => prev.map((d) => (d.day === day ? { ...d, isWorking: !d.isWorking } : d)));
  }

  function handleSubmit() {
    const result = branchSchema.safeParse({
      name,
      timezone,
      workingDays,
      workingStartTime: startTime,
      workingEndTime: endTime,
    });
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
      title={isEdit ? 'Edit Branch' : 'Create Branch'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Branch'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="branch-name" label="Branch name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />

        <div>
          <Label htmlFor="timezone" required>Timezone</Label>
          <Select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="startTime"
            label="Working start time"
            required
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            error={errors.workingStartTime}
          />
          <FormField
            id="endTime"
            label="Working end time"
            required
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            error={errors.workingEndTime}
          />
        </div>

        <div>
          <Label required>Working days</Label>
          <div className="grid grid-cols-2 gap-1">
            {workingDays.map((d) => (
              <Checkbox
                key={d.day}
                id={`day-${d.day}`}
                label={d.day.charAt(0).toUpperCase() + d.day.slice(1)}
                checked={d.isWorking}
                onChange={() => toggleDay(d.day)}
              />
            ))}
          </div>
          <ErrorText>{errors.workingDays}</ErrorText>
        </div>

        {mutation.isError && <ErrorText>Failed to save branch. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
