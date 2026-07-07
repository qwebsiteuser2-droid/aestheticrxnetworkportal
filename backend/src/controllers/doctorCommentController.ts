import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';
import { DoctorComment } from '../models/DoctorComment';
import { AuthenticatedRequest } from '../middleware/auth';

export const listDoctorComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: doctorId } = req.params;

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({
      where: { id: doctorId, user_type: UserType.DOCTOR, is_approved: true, is_deactivated: false },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const commentRepository = AppDataSource.getRepository(DoctorComment);
    const comments = await commentRepository.find({
      where: { doctor_id: doctorId },
      order: { created_at: 'DESC' },
      take: 100,
    });

    res.json({
      success: true,
      data: {
        comments: comments.map((c) => c.toJSON()),
        count: comments.length,
      },
    });
  } catch (error) {
    console.error('List doctor comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to load comments' });
  }
};

export const createDoctorComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: doctorId } = req.params;
    const user = req.user!;
    const trimmedComment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!trimmedComment || trimmedComment.length < 3) {
      res.status(400).json({
        success: false,
        message: 'Please enter a comment of at least 3 characters',
      });
      return;
    }

    if (user.user_type !== UserType.REGULAR) {
      res.status(403).json({
        success: false,
        message: 'Only patients can leave comments on doctor profiles',
      });
      return;
    }

    if (user.id === doctorId) {
      res.status(400).json({ success: false, message: 'You cannot comment on your own profile' });
      return;
    }

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({
      where: { id: doctorId, user_type: UserType.DOCTOR, is_approved: true, is_deactivated: false },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const authorName =
      user.doctor_name || user.email?.split('@')[0] || 'Patient';

    const commentRepository = AppDataSource.getRepository(DoctorComment);
    const comment = commentRepository.create({
      doctor_id: doctorId,
      author_user_id: user.id,
      author_name: authorName,
      comment: trimmedComment.slice(0, 2000),
    });
    const saved = await commentRepository.save(comment);

    res.status(201).json({
      success: true,
      message: 'Comment posted',
      data: { comment: saved.toJSON() },
    });
  } catch (error) {
    console.error('Create doctor comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to post comment' });
  }
};

export const deleteDoctorComment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!user.is_admin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const commentRepository = AppDataSource.getRepository(DoctorComment);
    const comment = await commentRepository.findOne({ where: { id } });

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    await commentRepository.remove(comment);

    res.json({ success: true, message: 'Comment removed' });
  } catch (error) {
    console.error('Delete doctor comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove comment' });
  }
};
