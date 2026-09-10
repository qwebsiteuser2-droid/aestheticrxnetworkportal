/**
 * Public profile photo URL for doctors.
 * Prefer uploaded Postgres blob over Google avatar URL; always version for cache bust.
 */
export function resolvePublicProfilePhotoUrl(doctor: {
  id: string;
  profile_photo_url?: string | null;
  profile_photo_data?: string | null;
  updated_at?: Date | string | null;
  has_stored_photo?: boolean | number | string | null;
}): string | null {
  const version = doctor.updated_at
    ? new Date(doctor.updated_at).getTime()
    : Date.now();
  const hasStored =
    Boolean(doctor.profile_photo_data) ||
    doctor.has_stored_photo === true ||
    doctor.has_stored_photo === 1 ||
    doctor.has_stored_photo === '1' ||
    doctor.has_stored_photo === 't' ||
    doctor.has_stored_photo === 'true';

  if (hasStored) {
    return `/api/profile-photos/${doctor.id}?v=${version}`;
  }

  const raw = (doctor.profile_photo_url || '').trim();
  if (!raw) return null;

  if (raw.includes('/api/profile-photos/')) {
    const base = raw.split('?')[0];
    return `${base}?v=${version}`;
  }

  return raw;
}
