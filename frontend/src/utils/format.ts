export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

export function healthColor(health: string): string {
  switch (health.toUpperCase()) {
    case 'ONLINE':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50';
    case 'DEGRADED':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/50';
    case 'FAULTED':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/50';
    case 'OFFLINE':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
  }
}

export function formatPowerOnHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  if (hours < 8760) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  const years = Math.floor(hours / 8760);
  const remaining = hours % 8760;
  const days = Math.floor(remaining / 24);
  return `${years}y ${days}d`;
}

export function formatScrubSchedule(schedule: { frequency: string; day_of_week: number; day_of_month: number; hour: number; minute: number }): string {
  const time = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (schedule.frequency) {
    case 'daily':
      return `Daily at ${time}`;
    case 'weekly':
      return `Weekly ${days[schedule.day_of_week] || 'Mon'} at ${time}`;
    case 'monthly':
      return `Monthly day ${schedule.day_of_month} at ${time}`;
    default:
      return `${schedule.frequency} at ${time}`;
  }
}

export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}
