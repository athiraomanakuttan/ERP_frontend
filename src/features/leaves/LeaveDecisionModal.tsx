import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { ErrorText } from '@/components/atoms/ErrorText';
import { decideLeaveRequest } from './leaveService';
import { LeaveRequest } from '@/types/entities';
import { z } from 'zod';

interface LeaveDecisionModalProps {
  request: LeaveRequest | null;
  decision: 'approve' | 'reject' | null;
  onClose: () => void;
}

export function LeaveDecisionModal({ request, decision, onClose }: LeaveDecisionModalProps) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const mutation = useMutation({
    mutationFn: () => decideLeaveRequest(request!._id, decision!, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests-pending'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests-mine'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance-me'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance-employee'] });
      setNote('');
      onClose();
    },
  });

  if (!request || !decision) return null;

  function submitDecision() {
    const result = z.string().trim().max(500, 'Note must be 500 characters or fewer').safeParse(note);
    if (!result.success) {
      setNoteError(result.error.issues[0]?.message ?? 'Invalid note');
      return;
    }
    setNoteError('');
    mutation.mutate();
  }

  return (
    <Modal
      isOpen={Boolean(request && decision)}
      onClose={onClose}
      title={decision === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={decision === 'reject' ? 'danger' : 'primary'} onClick={submitDecision} isLoading={mutation.isPending}>
            {decision === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-body">
          {decision === 'approve' ? 'Approve' : 'Reject'} this leave request
          {typeof request.employee !== 'string' ? ` from ${request.employee.firstName} ${request.employee.lastName ?? ''}` : ''}?
        </p>
        <FormField id="decisionNote" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} error={noteError} maxLength={500} />
        {mutation.isError && <ErrorText>Failed to record decision. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
