export function todayJST(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export function todayWithDayJST(): { dateStr: string; dayOfWeek: string } {
  const now = new Date();
  const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const dayOfWeek = new Intl.DateTimeFormat('ja-JP', {
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(now);
  return { dateStr, dayOfWeek };
}
