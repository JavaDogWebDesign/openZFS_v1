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
      return 'text-green-600 bg-green-50';
    case 'DEGRADED':
      return 'text-yellow-600 bg-yellow-50';
    case 'FAULTED':
      return 'text-red-600 bg-red-50';
    case 'OFFLINE':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
