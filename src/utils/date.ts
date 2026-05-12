/**
 * 日期工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDateForDisplay(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 获取前一天的起止时间戳（UTC）
 */
export function getPreviousDayBoundaries(): { start: number; end: number } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  // 前一天 00:00:00 UTC
  const start = Math.floor(today.getTime() / 1000) - 86400;
  
  // 前一天 23:59:59 UTC
  const end = Math.floor(today.getTime() / 1000) - 1;
  
  return { start, end };
}
