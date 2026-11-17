import { ApiError, listResult } from './client.js'

// Follow only the existing REST limit/offset contract. Never replace a failed
// page with local data or download a silently truncated report.
export async function readAllPages(api, path, { signal, onProgress, rowKey } = {}) {
  const [base, query = ''] = path.split('?'), params = new URLSearchParams(query)
  const items = [], seen = new Set()
  let total
  do {
    if (signal?.aborted) throw new DOMException('Đã hủy', 'AbortError')
    params.set('limit', '100'); params.set('offset', String(items.length))
    const page = listResult(await api.request(`${base}?${params}`, { signal }))
    if (!Number.isInteger(page.total) || page.total < 0 || (total !== undefined && total !== page.total)
      || (page.offset !== undefined && page.offset !== items.length)
      || (!page.items.length && items.length < page.total) || items.length + page.items.length > page.total) {
      throw new ApiError('Danh sách đã thay đổi hoặc server chưa trả đủ trang. Hãy tải lại rồi thử xuất lại.', 200, 'INCOMPLETE_LIST')
    }
    total = page.total
    for (const row of page.items) {
      const id = rowKey && row[rowKey]
      if (id !== undefined && id !== null) {
        if (seen.has(String(id))) throw new ApiError('Server trả bản ghi trùng giữa các trang. Hãy tải lại danh sách.', 200, 'DUPLICATE_PAGE')
        seen.add(String(id))
      }
      items.push(row)
    }
    onProgress?.({ loaded: items.length, total })
  } while (items.length < total)
  if (signal?.aborted) throw new DOMException('Đã hủy', 'AbortError')
  return { items, total }
}
