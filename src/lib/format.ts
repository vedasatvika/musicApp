/** "3d", "2h", "just now" style relative time for the feed. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const secs = Math.max(0, (Date.now() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = secs / 60
  if (mins < 60) return `${Math.floor(mins)}m`
  const hrs = mins / 60
  if (hrs < 24) return `${Math.floor(hrs)}h`
  const days = hrs / 24
  if (days < 7) return `${Math.floor(days)}d`
  const weeks = days / 7
  if (weeks < 5) return `${Math.floor(weeks)}w`
  return `${Math.floor(days / 30)}mo`
}
