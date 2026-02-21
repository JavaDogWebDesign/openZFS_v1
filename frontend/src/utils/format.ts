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
