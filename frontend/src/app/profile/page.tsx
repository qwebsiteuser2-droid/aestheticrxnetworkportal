'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { Header } from '@/components/layout/Header';
import api from '@/lib/api';
import { getProfileImageUrl } from '@/lib/apiConfig';
import { compressProfilePhoto } from '@/lib/compressProfilePhoto';
import { CameraIcon } from '@heroicons/react/24/outline';

/**
 * Doctor profile settings — photo upload (then link to full public profile).
 */
export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    if (user.user_type === 'regular' || user.user_type === 'employee') {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (user?.profile_photo_url) {
      setPreview(getProfileImageUrl(user.profile_photo_url));
    }
  }, [user?.profile_photo_url]);

  const onPick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressProfilePhoto(file);
      const form = new FormData();
      form.append('photo', compressed, 'profile.jpg');
      const res = await api.post('/auth/profile-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        toast.success('Profile photo updated');
        const url = res.data.data?.profile_photo_url as string | undefined;
        if (url) setPreview(getProfileImageUrl(url));
      } else {
        toast.error(res.data?.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (isLoading || !user || user.user_type === 'regular' || user.user_type === 'employee') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const initials = (user.doctor_name || 'D')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLoginClick={() => router.push('/login')}
        onRegisterClick={() => router.push('/signup/select-type')}
        isAuthenticated={isAuthenticated}
        user={user}
      />
      <main className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile photo</h1>
        <p className="text-sm text-gray-600 mb-6">
          Upload a clear professional photo for Find Pros cards. Images are compressed on your device
          (max ~600px, under ~150KB) before upload. You can also change your photo from your full
          profile page.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-3xl font-semibold mb-4">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <p className="font-medium text-gray-900 mb-1">{user.doctor_name}</p>
          {user.clinic_name && <p className="text-sm text-gray-500 mb-4">{user.clinic_name}</p>}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <CameraIcon className="w-5 h-5" />
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>

          <Link
            href={user.id ? `/user/${user.id}` : '/'}
            className="mt-6 text-sm text-blue-600 hover:underline"
          >
            Open full profile page →
          </Link>
        </div>
      </main>
    </div>
  );
}
