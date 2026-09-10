import { createHash } from 'crypto';
import { Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';
import { AuthenticatedRequest } from '../types/auth';
import { resolvePublicProfilePhotoUrl } from '../utils/profilePhotoUrl';

const MAX_STORED_BYTES = 180 * 1024; // ~180KB base64 payload

/**
 * POST /api/auth/profile-photo
 * Doctor uploads compressed profile photo (memory → Postgres).
 */
export const uploadMyProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ success: false, message: 'No photo file provided' });
      return;
    }

    if (file.buffer.length > MAX_STORED_BYTES) {
      res.status(400).json({
        success: false,
        message: 'Photo too large after upload. Please use a smaller image (under ~150KB).',
      });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({ where: { id: userId } });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (doctor.user_type !== UserType.DOCTOR && !doctor.is_admin) {
      res.status(403).json({
        success: false,
        message: 'Only doctors can upload a professional profile photo',
      });
      return;
    }

    const mime = file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${file.buffer.toString('base64')}`;
    const publicPath = `/api/profile-photos/${doctor.id}`;

    doctor.profile_photo_data = dataUrl;
    doctor.profile_photo_url = publicPath;
    await doctorRepository.save(doctor);

    const versionedUrl = resolvePublicProfilePhotoUrl({
      id: doctor.id,
      profile_photo_url: publicPath,
      profile_photo_data: dataUrl,
      updated_at: doctor.updated_at || new Date(),
    });

    res.json({
      success: true,
      message: 'Profile photo updated',
      data: {
        profile_photo_url: versionedUrl,
      },
    });
  } catch (error) {
    console.error('uploadMyProfilePhoto error:', error);
    res.status(500).json({ success: false, message: 'Failed to save profile photo' });
  }
};

/**
 * GET /api/profile-photos/:id — public serve of stored profile photo
 */
export const serveProfilePhoto = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Doctor id required' });
      return;
    }

    const rows = await AppDataSource.query(
      `SELECT profile_photo_data, updated_at FROM doctors WHERE id = $1`,
      [id]
    );
    const row = rows[0];
    const data = row?.profile_photo_data as string | undefined;

    if (!data) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match || !match[1] || !match[2]) {
      res.status(500).json({ error: 'Invalid photo data' });
      return;
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const etag = `"${createHash('sha1').update(buffer).digest('hex')}"`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', etag);
    res.setHeader('Content-Length', String(buffer.length));

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.send(buffer);
  } catch (error) {
    console.error('serveProfilePhoto error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to serve photo' });
    }
  }
};
