import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { billingStatus, emptyBill, toCentavos, totalCentavos, validateBill } from '../src/billing.js'
import { createBillingMiddleware } from '../server/billing-api.js'

const validBill = () => ({ ...emptyBill('BT-103'), periodStart: '2026-10-01', periodEnd: '2026-10-31', issueDate: '2026-10-27', dueDate: '2026-11-05', items: [{ service: 'Occupational therapy', description: 'October sessions', sessions: '3', rate: '1000.10' }, { service: 'Family guidance', description: 'Guardian consultation', sessions: '2', rate: '500.25' }], reviewed: true })

test('calculates multiple session charges exactly in centavos', () => {
  assert.equal(totalCentavos(validBill().items), 400080)
  assert.equal(totalCentavos([{ sessions: 3, rate: '0.10' }]), 30)
  assert.equal(toCentavos('100000.00'), 10000000)
  for (const value of ['1.001', '-1', '1e3', '', 'NaN', 'Infinity']) assert.equal(toCentavos(value), null)
})

test('validates required fields, real dates, date order, and review confirmation', () => {
  assert.deepEqual(validateBill(validBill()), {})
  const errors = validateBill({ ...validBill(), studentId: '', periodStart: '2026-11-01', periodEnd: '2026-10-31', issueDate: '2026-02-30', dueDate: '', reviewed: false, notes: 'x'.repeat(1001) })
  for (const key of ['studentId', 'periodEnd', 'issueDate', 'dueDate', 'reviewed', 'notes']) assert.ok(errors[key], key)
  assert.ok(validateBill({ ...validBill(), dueDate: '2026-10-26' }).dueDate)
  assert.doesNotThrow(() => validateBill(null))
})

test('rejects invalid services, fractional sessions, invalid rates, and missing descriptions', () => {
  const errors = validateBill({ ...validBill(), items: [{ service: 'Unknown', description: ' ', sessions: '1.5', rate: '0' }] })
  for (const key of ['service', 'description', 'sessions', 'rate']) assert.ok(errors[`items.0.${key}`], key)
  for (const sessions of ['', 0, -1, 1001, '1e2']) assert.ok(validateBill({ ...validBill(), items: [{ ...validBill().items[0], sessions }] })['items.0.sessions'])
  for (const rate of ['0.001', '100000.01', '-10', '1e3']) assert.ok(validateBill({ ...validBill(), items: [{ ...validBill().items[0], rate }] })['items.0.rate'])
  assert.ok(validateBill({ ...validBill(), items: [] }).items)
  assert.ok(validateBill({ ...validBill(), items: Array(21).fill(validBill().items[0]) }).items)
  assert.ok(validateBill(validBill(), 400081).items)
})

test('classifies balances correctly on the due date and after it', () => {
  const record = { totalCentavos: 100000, amountPaidCentavos: 0, dueDate: '2026-10-27' }
  assert.equal(billingStatus(record, '2026-10-27'), 'Pending')
  assert.equal(billingStatus(record, '2026-10-28'), 'Overdue')
  assert.equal(billingStatus({ ...record, amountPaidCentavos: 100000 }, '2026-10-28'), 'Paid')
})

test('dummy API retrieves, validates, saves, recalculates, and persists student billing', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'breakthrough-billing-test-'))
  const filePath = join(directory, 'billing.json')
  const middleware = createBillingMiddleware({ filePath })
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await unlink(filePath).catch(() => {})
    await unlink(`${filePath}.tmp`).catch(() => {})
    await rmdir(directory)
  })
  const base = `http://127.0.0.1:${server.address().port}/api/billing`
  const send = (path, body, method = 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const seed = await (await fetch(`${base}?studentId=BT-101`)).json()
  assert.equal(seed[0].totalCentavos, 1200000)
  assert.equal(seed[0].balanceCentavos, 900000)
  assert.deepEqual(await (await fetch(`${base}?studentId=BT-103`)).json(), [])
  assert.equal((await fetch(base)).status, 400)
  for (const payload of [null, {}, { ...validBill(), dueDate: '2026-01-01' }]) assert.equal((await send('', payload)).status, 422)
  assert.equal((await send('/unknown', validBill(), 'PUT')).status, 404)

  const response = await send('', { ...validBill(), totalCentavos: 1, amountPaidCentavos: 999999 })
  assert.equal(response.status, 201)
  const created = await response.json()
  assert.equal(created.totalCentavos, 400080)
  assert.equal(created.amountPaidCentavos, 0)
  assert.equal(created.revision, 1)
  assert.equal(created.studentId, 'BT-103')
  assert.equal(JSON.parse(await readFile(filePath, 'utf8')).filter(record => record.studentId === 'BT-103').length, 1)

  const updatedResponse = await send(`/${created.id}`, { ...created, items: [{ ...created.items[0], sessions: 4 }], amountPaidCentavos: 100000 }, 'PUT')
  assert.equal(updatedResponse.status, 200)
  const updated = await updatedResponse.json()
  assert.equal(updated.totalCentavos, 400040)
  assert.equal(updated.amountPaidCentavos, 0)
  assert.equal(updated.revision, 2)
  assert.equal((await send(`/${created.id}`, created, 'PUT')).status, 409)
  assert.equal((await send(`/${seed[0].id}`, { ...seed[0], items: [{ ...seed[0].items[0], sessions: 1 }] }, 'PUT')).status, 422)
  assert.equal((await fetch(`${base}?studentId=BT-101`)).status, 200)

  const parallel = await Promise.all([send('', validBill()), send('', validBill())])
  assert.deepEqual(parallel.map(result => result.status), [201, 201])
  const saved = await (await fetch(`${base}?studentId=BT-103`)).json()
  assert.equal(saved.length, 3)
  assert.equal(new Set(saved.map(record => record.id)).size, 3)
})
