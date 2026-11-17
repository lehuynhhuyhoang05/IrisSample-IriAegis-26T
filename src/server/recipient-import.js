import { parseCSV } from '../portal/csv.js'

// CSV is a browser convenience; writes still use EmailRecipientInput, one POST
// per new recipient. No invented bulk-import endpoint or local-only recipients.
export function recipientRows(text, existing = []) {
  const known = new Set(existing.map(row => row.email_address.toLowerCase()))
  const seen = new Set()
  return parseCSV(text).map((row, index) => {
    if (!Object.hasOwn(row, 'email_address')) throw new Error('CSV cần cột email_address; recipient_name và is_selected là tùy chọn.')
    const email = row.email_address.trim().toLowerCase(), selected = row.is_selected?.toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Dòng ${index + 1}: email không hợp lệ.`)
    if (selected && !['true', 'false', '1', '0'].includes(selected)) throw new Error(`Dòng ${index + 1}: is_selected chỉ nhận true/false hoặc 1/0.`)
    const status = known.has(email) ? 'existing' : seen.has(email) ? 'duplicate' : 'pending'
    seen.add(email)
    return { id: index + 1, body: { email_address: email, recipient_name: row.recipient_name || '', is_selected: !['false', '0'].includes(selected) }, status }
  })
}
