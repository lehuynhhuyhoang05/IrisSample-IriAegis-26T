export function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Presentation only. Keep ISO strings unchanged in requests and CSV exports.
export const displayDate = value => value ? value.split('-').reverse().join('/') : '—'
