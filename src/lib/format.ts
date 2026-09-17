export function formatInrFromLakhs(lakhs: number): string {
  if (lakhs >= 100) {
    const crore = lakhs / 100
    const digits = crore >= 10 ? 2 : 2
    return `₹${crore.toFixed(digits)} Crore`
  }
  return `₹${lakhs.toFixed(1)} Lakhs`
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 36e5)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
