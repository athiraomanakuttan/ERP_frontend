import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/molecules/Modal';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { ErrorText } from '@/components/atoms/ErrorText';
import { createAnnouncement } from './announcementService';
import { announcementSchema } from './announcement.schema';
import { scrollToFirstError, zodFieldErrors } from '@/utils/validation';

export function AnnouncementFormModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => createAnnouncement({ title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setTitle('');
      setBody('');
      onClose();
    },
  });

  function handleSubmit() {
    const result = announcementSchema.safeParse({ title, body });
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
      title="Publish Announcement"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={mutation.isPending}>
            Publish
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField id="announcementTitle" label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={120} />
        <div>
          <Label htmlFor="announcementBody" required>Message</Label>
          <textarea
            id="announcementBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            className="w-full rounded-md border border-line px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <ErrorText>{errors.body}</ErrorText>
        </div>
        {mutation.isError && <ErrorText>Failed to publish announcement. Please try again.</ErrorText>}
      </div>
    </Modal>
  );
}
