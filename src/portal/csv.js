// Quoted values, escaped quotes, BOM, CRLF and multiline cells are supported.
export function parseCSV(text) {
  if (text.length > 1000000) throw new Error('CSV tối đa 1 MB.')
  const rows = []; let row = [], cell = '', quoted = false, closed = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else cell += c
    } else if (c === '"' && !cell && !closed) quoted = true
    else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell.trim()); cell = ''; closed = false
      if (c !== ',') { if (row.some(Boolean)) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++ }
    } else {
      if (closed && c.trim()) throw new Error('CSV có ký tự sau dấu ngoặc kép đóng.')
      cell += c
    }
  }
  if (quoted) throw new Error('CSV thiếu dấu ngoặc kép đóng.')
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row)
  if (rows.length < 2 || rows.length > 501) throw new Error('CSV cần hàng tiêu đề và từ 1 đến 500 bản ghi.')
  const headers = rows.shift()
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error('Tiêu đề CSV rỗng hoặc trùng nhau.')
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`Dòng dữ liệu ${i + 1}: số cột không khớp tiêu đề.`)
    return Object.fromEntries(headers.map((key, index) => [key, values[index]]))
  })
}
export function csvText(headers, rows) {
  const cell = value => { let text = String(value ?? ''); if (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"` }
  return '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n')
}
export function download(content, filename, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
