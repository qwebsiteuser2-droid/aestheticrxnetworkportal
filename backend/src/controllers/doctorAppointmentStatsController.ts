import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source';
import { Doctor, UserType } from '../models/Doctor';

const ACCEPTED_STATUSES = ['accepted', 'active'];

function parseDateRange(query: Request['query']): { from: Date; to: Date } {
  const now = new Date();
  let from: Date;
  let to: Date;

  const year = query.year ? parseInt(String(query.year), 10) : NaN;
  const month = typeof query.month === 'string' ? query.month.trim() : '';

  if (!isNaN(year) && year >= 2000 && year <= 2100) {
    from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  } else if (/^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    to = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  } else {
    const fromStr = typeof query.from === 'string' ? query.from : '';
    const toStr = typeof query.to === 'string' ? query.to : '';
    if (fromStr) {
      from = new Date(fromStr);
      if (isNaN(from.getTime())) from = new Date(now.getFullYear(), 0, 1);
    } else {
      from = new Date(now.getFullYear(), 0, 1);
    }
    if (toStr) {
      to = new Date(toStr);
      if (isNaN(to.getTime())) to = now;
      to.setHours(23, 59, 59, 999);
    } else {
      to = now;
    }
  }

  return { from, to };
}

/**
 * GET /api/public/doctors/:id/appointment-stats
 * Query: from, to, year, month (YYYY-MM), groupBy=month|year
 */
export const getDoctorAppointmentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const groupBy = req.query.groupBy === 'year' ? 'year' : 'month';
    const { from, to } = parseDateRange(req.query);

    const doctorRepository = AppDataSource.getRepository(Doctor);
    const doctor = await doctorRepository.findOne({
      where: { id, user_type: UserType.DOCTOR, is_approved: true, is_deactivated: false },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const trunc = groupBy === 'year' ? 'year' : 'month';
    const periodFormat = groupBy === 'year' ? 'YYYY' : 'YYYY-MM';

    const summaryRows = await AppDataSource.query(
      `
      SELECT
        COUNT(*)::int AS received,
        COUNT(*) FILTER (WHERE status = ANY($3))::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM conversations
      WHERE doctor_id = $1
        AND created_at >= $2
        AND created_at <= $4
      `,
      [id, from, ACCEPTED_STATUSES, to]
    );

    const breakdownRows = await AppDataSource.query(
      `
      SELECT
        to_char(date_trunc($5, created_at AT TIME ZONE 'UTC'), $6) AS period,
        COUNT(*)::int AS received,
        COUNT(*) FILTER (WHERE status = ANY($3))::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM conversations
      WHERE doctor_id = $1
        AND created_at >= $2
        AND created_at <= $4
      GROUP BY date_trunc($5, created_at AT TIME ZONE 'UTC')
      ORDER BY period ASC
      `,
      [id, from, ACCEPTED_STATUSES, to, trunc, periodFormat]
    );

    const summary = summaryRows[0] || { received: 0, accepted: 0, pending: 0 };

    res.json({
      success: true,
      data: {
        doctor_id: id,
        filter: {
          from: from.toISOString(),
          to: to.toISOString(),
          group_by: groupBy,
        },
        summary: {
          received: Number(summary.received) || 0,
          accepted: Number(summary.accepted) || 0,
          pending: Number(summary.pending) || 0,
        },
        breakdown: breakdownRows.map((row: Record<string, unknown>) => ({
          period: row.period,
          received: Number(row.received) || 0,
          accepted: Number(row.accepted) || 0,
          pending: Number(row.pending) || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Doctor appointment stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load appointment statistics' });
  }
};
