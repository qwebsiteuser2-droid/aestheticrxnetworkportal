'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { FaCalendarAlt, FaCheckCircle, FaClock } from 'react-icons/fa';

interface MonthlyRow {
  period: string;
  received: number;
  accepted: number;
  pending: number;
}

interface StatsData {
  summary: { received: number; accepted: number; pending: number };
  breakdown: MonthlyRow[];
  filter: { from: string; to: string; group_by: string };
}

interface Props {
  doctorId: string;
}

export default function DoctorAppointmentStatsTab({ doctorId }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<'month' | 'year'>('month');
  const [filterMode, setFilterMode] = useState<'year' | 'month' | 'range'>('year');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('groupBy', groupBy);

      if (filterMode === 'year' && year) {
        params.set('year', year);
      } else if (filterMode === 'month' && month) {
        params.set('month', month);
      } else if (filterMode === 'range') {
        if (from) params.set('from', from);
        if (to) params.set('to', to);
      }

      const response = await api.get(
        `/public/doctors/${doctorId}/appointment-stats?${params.toString()}`
      );

      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load appointment stats:', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId, year, month, from, to, groupBy, filterMode]);

  useEffect(() => {
    if (doctorId) loadStats();
  }, [doctorId, loadStats]);

  const maxReceived = Math.max(
    1,
    ...(stats?.breakdown.map((r) => r.received) || [1])
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
        <FaCalendarAlt className="text-blue-500 mr-3" />
        Appointment Statistics
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Requests patients sent to this doctor and how many were accepted or completed.
      </p>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as 'year' | 'month' | 'range')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="year">By year</option>
          <option value="month">By month</option>
          <option value="range">Date range</option>
        </select>

        {filterMode === 'year' && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        )}

        {filterMode === 'month' && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        )}

        {filterMode === 'range' && (
          <>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-500 self-center">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </>
        )}

        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as 'month' | 'year')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="month">Group by month</option>
          <option value="year">Group by year</option>
        </select>

        <button
          type="button"
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading statistics...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-blue-700">{stats.summary.received}</div>
              <div className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                <FaCalendarAlt className="text-blue-500" /> Received
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-green-700">{stats.summary.accepted}</div>
              <div className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                <FaCheckCircle className="text-green-500" /> Accepted / done
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-amber-700">{stats.summary.pending}</div>
              <div className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                <FaClock className="text-amber-500" /> Pending
              </div>
            </div>
          </div>

          {stats.breakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-3 pr-4">Period</th>
                    <th className="py-3 pr-4">Received</th>
                    <th className="py-3 pr-4">Accepted</th>
                    <th className="py-3 pr-4">Pending</th>
                    <th className="py-3">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breakdown.map((row) => (
                    <tr key={row.period} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{row.period}</td>
                      <td className="py-3">{row.received}</td>
                      <td className="py-3 text-green-700">{row.accepted}</td>
                      <td className="py-3 text-amber-700">{row.pending}</td>
                      <td className="py-3 w-40">
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(row.received / maxReceived) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No appointments in this period.</p>
          )}
        </>
      ) : (
        <p className="text-center text-gray-500 py-8">Could not load statistics.</p>
      )}
    </div>
  );
}
