import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { IconButton } from '@/components/atoms/IconButton';
import { Trash2, Plus, Megaphone } from 'lucide-react';
import { Spinner } from '@/components/atoms/Spinner';
import { Pagination } from '@/components/molecules/Pagination';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { listAnnouncements, deleteAnnouncement } from '@/features/announcements/announcementService';
import { AnnouncementFormModal } from '@/features/announcements/AnnouncementFormModal';
import { useAppSelector } from '@/store/hooks';
import { Announcement } from '@/types/entities';

const PAGE_SIZE = 8;

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAppSelector((s) => s.auth.employee?.isAdmin);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const listParams = { page, limit: PAGE_SIZE };
  const { data, isLoading } = useQuery({
    queryKey: ['announcements', listParams],
    queryFn: () => listAnnouncements(listParams),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDeleting(null);
    },
  });

  const announcements = data?.items ?? [];

  function authorName(a: Announcement) {
    return typeof a.publishedBy === 'string' ? 'Admin' : `${a.publishedBy.firstName} ${a.publishedBy.lastName ?? ''}`.trim();
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Publish Announcement</Button>
        </div>
      )}

      {isLoading ? (
        <Spinner className="mx-auto" />
      ) : announcements.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-faint">
          No announcements yet.
        </p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a._id} className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-heading">{a.title}</p>
                  <p className="mt-1 text-xs text-faint">
                    {authorName(a)} · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isAdmin && (
                  <IconButton onClick={() => setDeleting(a)} aria-label="Delete announcement">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-body">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="rounded-2xl border border-line bg-surface shadow-panel">
          <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      <AnnouncementFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete announcement"
        message={`Delete "${deleting?.title}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting._id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
