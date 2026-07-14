export const ACTIVE_JOB_STATUSES = ['Quoted', 'Confirmed', 'Out']

export function isoDate(value = new Date()) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso, amount) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + amount)
  return isoDate(d)
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value) || 0)
}

export function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart
}

export function uuidOrNull(value) {
  return value && String(value).trim() ? value : null
}

export function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function parseCsv(text) {
  const rows = []
  let row = [], value = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else value += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(value); value = '' }
    else if (ch === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = '' }
    else value += ch
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row) }
  if (!rows.length) return []
  const headers = rows[0].map(x => x.trim().toLowerCase().replaceAll(' ', '_'))
  return rows.slice(1).filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
}
