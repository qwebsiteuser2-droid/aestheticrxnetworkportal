'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FaComment, FaTrash } from 'react-icons/fa';

interface DoctorComment {
  id: string;
  author_name: string;
  comment: string;
  created_at: string;
}

interface Props {
  doctorId: string;
  isAdmin: boolean;
  canPostComment: boolean;
}

export default function DoctorPatientCommentsTab({
  doctorId,
  isAdmin,
  canPostComment,
}: Props) {
  const [comments, setComments] = useState<DoctorComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/public/doctors/${doctorId}/comments`);
      if (response.data?.success) {
        setComments(response.data.data?.comments || []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (doctorId) loadComments();
  }, [doctorId, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (trimmed.length < 3) {
      toast.error('Comment must be at least 3 characters');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/public/doctors/${doctorId}/comments`, {
        comment: trimmed,
      });
      if (response.data?.success) {
        toast.success('Comment posted');
        setNewComment('');
        await loadComments();
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to post comment';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!isAdmin) return;
    if (!confirm('Remove this comment?')) return;

    try {
      const response = await api.delete(`/admin/doctor-comments/${commentId}`);
      if (response.data?.success) {
        toast.success('Comment removed');
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      toast.error('Failed to remove comment');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
        <FaComment className="text-indigo-500 mr-3" />
        Patient Comments
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Feedback from patients who have used this doctor&apos;s services.
      </p>

      {canPostComment && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 bg-indigo-50 rounded-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share your experience
          </label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a comment about this doctor..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      )}

      {!canPostComment && !isAdmin && (
        <p className="text-sm text-gray-500 mb-6 p-3 bg-gray-50 rounded-lg">
          Sign in as a patient to leave a comment on this profile.
        </p>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li
              key={c.id}
              className="border border-gray-100 rounded-xl p-4 flex justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900">{c.author_name}</div>
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(c.created_at).toLocaleString()}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{c.comment}</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remove comment (admin)"
                >
                  <FaTrash />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
