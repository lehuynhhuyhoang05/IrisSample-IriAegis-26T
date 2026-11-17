import test from 'node:test'
import assert from 'node:assert/strict'
import { readAllPages } from './server/pagination.js'
import { recipientRows } from './server/recipient-import.js'

test('full export preserves filters, restarts offset, follows server pages and reports progress', async () => {
  const requests = [], progress = [], rows = Array.from({ length: 203 }, (_, i) => ({ checkin_id: i }))
  const api = { request: async path => {
    const url = new URL(path, 'https://test.local'); requests.push(url)
    const offset = Number(url.searchParams.get('offset'))
    return { items: rows.slice(offset, offset + 100), total: rows.length, offset }
  } }
  const all = await readAllPages(api, '/checkins?subject_id=WEB301&student_id=SV001&date_from=2026-11-01&sort=-checkin_date&limit=25&offset=25', { rowKey: 'checkin_id', onProgress: value => progress.push(value.loaded) })
  assert.deepEqual(all.items, rows)
  assert.deepEqual(progress, [100, 200, 203])
  assert.deepEqual(requests.map(url => url.searchParams.get('offset')), ['0', '100', '200'])
  for (const url of requests) {
    assert.equal(url.searchParams.get('limit'), '100')
    assert.equal(url.searchParams.get('subject_id'), 'WEB301')
    assert.equal(url.searchParams.get('student_id'), 'SV001')
    assert.equal(url.searchParams.get('date_from'), '2026-11-01')
    assert.equal(url.searchParams.get('sort'), '-checkin_date')
  }
})

test('full export rejects changing totals, missing/duplicated pages and request failures', async () => {
  for (const second of [
    { items: [], total: 2, offset: 1 },
    { items: [{ id: 2 }], total: 3, offset: 1 },
    { items: [{ id: 2 }], total: 2, offset: 0 },
    { items: [{ id: 1 }], total: 2, offset: 1 },
  ]) {
    let calls = 0
    await assert.rejects(readAllPages({ request: async () => ++calls === 1 ? { items: [{ id: 1 }], total: 2, offset: 0 } : second }, '/attendance', { rowKey: 'id' }))
    assert.equal(calls, 2)
  }
  await assert.rejects(readAllPages({ request: async () => { throw new Error('Server offline') } }, '/attendance'), /Server offline/)
})

test('full export handles empty lists and aborts without fetching another page', async () => {
  assert.deepEqual(await readAllPages({ request: async () => ({ items: [], total: 0 }) }, '/attendance'), { items: [], total: 0 })
  const controller = new AbortController(); let calls = 0
  await assert.rejects(readAllPages({ request: async () => { calls++; return { items: [{ id: 1 }], total: 2 } } }, '/attendance', { signal: controller.signal, onProgress: () => controller.abort() }), { name: 'AbortError' })
  assert.equal(calls, 1)
})

test('recipient CSV marks existing/local duplicates, uses API fields and explicit selection', () => {
  const rows = recipientRows('email_address,recipient_name,is_selected,extra\nKnown@test.local,Đào tạo,true,ignored\nNEW@test.local,"Họ, tên",false,x\nnew@test.local,Trùng,1,x\nother@test.local,,0,x', [{ email_address: 'known@test.local' }])
  assert.deepEqual(rows.map(row => row.status), ['existing', 'pending', 'duplicate', 'pending'])
  assert.deepEqual(rows[1].body, { email_address: 'new@test.local', recipient_name: 'Họ, tên', is_selected: false })
  assert.equal(rows[3].body.is_selected, false)
  assert.equal(recipientRows('email_address\na@test.local')[0].body.is_selected, true)
})

test('recipient CSV validates all lines before any request; rejects missing header/invalid values', () => {
  for (const csv of ['email\na@test.local', 'email_address\na@test.local\nbad-email', 'email_address,is_selected\na@test.local,yes']) assert.throws(() => recipientRows(csv))
})
