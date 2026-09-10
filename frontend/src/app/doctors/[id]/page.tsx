'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Legacy public doctor URL — redirect to the full /user/[id] profile.
 * Keeps Search Console / bookmarked /doctors/:id links working.
 */
export default function DoctorProfileRedirectPage() {
  const { id } = useParams();
  const router = useRouter();
  const doctorId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (doctorId) {
      router.replace(`/user/${doctorId}`);
    } else {
      router.replace('/doctors');
    }
  }, [doctorId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
