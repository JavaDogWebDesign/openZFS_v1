import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listScrubSchedules, createScrubSchedule, updateScrubSchedule, deleteScrubSchedule } from '../../api/pools';
import type { ScrubSchedule } from '../../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ScrubScheduleFormProps {
  poolName: string;
}

export default function ScrubScheduleForm({ poolName }: ScrubScheduleFormProps) {
  const queryClient = useQueryClient();
  const { data: schedules = [] } = useQuery({
    queryKey: ['scrub-schedules'],
    queryFn: listScrubSchedules,
  });

  const schedule = schedules.find((s) => s.pool === poolName);

  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hour, setHour] = useState(2);
  const [minute, setMinute] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (schedule) {
      setFrequency(schedule.frequency);
      setDayOfWeek(schedule.day_of_week);
      setDayOfMonth(schedule.day_of_month);
      setHour(schedule.hour);
      setMinute(schedule.minute);
      setEnabled(schedule.enabled);
    }
  }, [schedule]);

  const createMutation = useMutation({
    mutationFn: () => createScrubSchedule(poolName, {
      pool: poolName,
      frequency,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      hour,
      minute,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scrub-schedules'] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ScrubSchedule>) => updateScrubSchedule(poolName, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scrub-schedules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScrubSchedule(poolName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scrub-schedules'] }),
  });

  const handleSave = () => {
    if (schedule) {
      updateMutation.mutate({ frequency, day_of_week: dayOfWeek, day_of_month: dayOfMonth, hour, minute, enabled });
    } else {
      createMutation.mutate();
    }
  };

  const inputClass = "rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Scrub Schedule</h3>
        {schedule && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (schedule) updateMutation.mutate({ enabled: e.target.checked });
              }}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
          </label>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</label>
          <div className="mt-2 flex gap-3">
            {(['daily', 'weekly', 'monthly'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
                  frequency === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day of Week</label>
            <div className="mt-2 flex gap-2">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDayOfWeek(i)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    dayOfWeek === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {frequency === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day of Month</label>
            <input
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className={`mt-1 w-24 ${inputClass}`}
            />
          </div>
        )}

        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hour</label>
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className={`mt-1 ${inputClass}`}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minute</label>
            <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className={`mt-1 ${inputClass}`}>
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>

        {schedule?.last_run && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last run: {new Date(schedule.last_run * 1000).toLocaleString()}
            {schedule.last_status && (
              <span className={`ml-2 ${schedule.last_status === 'started' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ({schedule.last_status})
              </span>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
          {schedule && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
            >
              Delete Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
