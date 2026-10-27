import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { billingStatus, totalCentavos, validateBill } from '../src/billing.js'

const seedRecords = () => [
  { id: 'BILL-2026-101', studentId: 'BT-101', periodStart: '2026-10-01', periodEnd: '2026-10-31', issueDate: '2026-10-27', dueDate: '2026-11-05', items: [{ service: 'Behavior therapy', description: 'October therapy sessions', sessions: 8, rate: '1500.00' }], notes: 'Monthly therapy billing.', reviewed: true, amountPaidCentavos: 300000, revision: 1, updatedAt: '2026-10-27T01:00:00.000Z' },
  { id: 'BILL-2026-102', studentId: 'BT-102', periodStart: '2026-09-01', periodEnd: '2026-09-30', issueDate: '2026-09-30', dueDate: '2026-10-10', items: [{ service: 'Speech therapy', description: 'September therapy sessions', sessions: 4, rate: '1200.00' }], notes: '', reviewed: true, amountPaidCentavos: 0, revision: 1, updatedAt: '2026-09-30T01:00:00.000Z' },
]

function present(record) {
  const result = { ...record, totalCentavos: totalCentavos(record.items) }
  return { ...result, balanceCentavos: result.totalCentavos - result.amountPaidCentavos, status: billingStatus(result) }
}

export function createBillingMiddleware({ filePath }) {
  // Serialize mutations to keep simultaneous saves from overwriting each other.
  let queue = Promise.resolve()
  async function readRecords() {
    try {
      const records = JSON.parse(await readFile(filePath, 'utf8'))
      if (!Array.isArray(records)) throw new Error('Invalid billing data.')
      return records
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return seedRecords()
    }
  }
  async function persist(records) {
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(`${filePath}.tmp`, JSON.stringify(records, null, 2), 'utf8')
    await rename(`${filePath}.tmp`, filePath)
  }
  return async function billingMiddleware(req, res, next) {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== '/api/billing' && !url.pathname.startsWith('/api/billing/')) return next()
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    try {
      if (req.method === 'GET' && url.pathname === '/api/billing') {
        const studentId = url.searchParams.get('studentId')
        if (!studentId || !/^[A-Za-z0-9-]{1,64}$/.test(studentId)) return send(400, { message: 'Select a valid student profile.' })
        return send(200, (await readRecords()).filter(record => record.studentId === studentId).map(present))
      }
      const id = url.pathname.slice('/api/billing/'.length)
      if (!((req.method === 'POST' && url.pathname === '/api/billing') || (req.method === 'PUT' && /^[A-Za-z0-9-]+$/.test(id)))) return send(405, { message: 'This billing action is not supported.' })
      if (!req.headers['content-type']?.includes('application/json')) return send(415, { message: 'Send billing information as JSON.' })
      let text = ''
      req.setEncoding('utf8')
      for await (const chunk of req) {
        text += chunk.toString()
        if (Buffer.byteLength(text) > 65536) return send(413, { message: 'The billing record is too large.' })
      }
      let bill
      try { bill = JSON.parse(text) } catch { return send(400, { message: 'The billing request is not valid JSON.' }) }
      const operation = queue.then(async () => {
        const records = await readRecords()
        const existing = req.method === 'PUT' ? records.find(record => record.id === id) : null
        if (req.method === 'PUT' && !existing) return send(404, { message: 'This billing record was not found. Reload the student records.' })
        if (existing && (bill?.revision !== existing.revision || bill?.studentId !== existing.studentId)) return send(409, { message: 'This bill has changed in another session. Reload the student records before editing again.' })
        const errors = validateBill(bill, existing?.amountPaidCentavos || 0)
        if (Object.keys(errors).length) return send(422, { message: 'Check the highlighted billing fields.', errors })
        // Accept only editable fields. Payment totals are owned by payment recording.
        const record = { id: existing?.id || `BILL-${randomUUID()}`, studentId: bill.studentId, periodStart: bill.periodStart, periodEnd: bill.periodEnd, issueDate: bill.issueDate, dueDate: bill.dueDate, items: bill.items.map(item => ({ service: item.service, description: item.description.trim(), sessions: Number(item.sessions), rate: String(item.rate) })), notes: bill.notes.trim(), reviewed: true, amountPaidCentavos: existing?.amountPaidCentavos || 0, revision: (existing?.revision || 0) + 1, updatedAt: new Date().toISOString() }
        await persist(existing ? records.map(value => value.id === id ? record : value) : [record, ...records])
        return send(existing ? 200 : 201, present(record))
      })
      queue = operation.catch(() => {})
      await operation
    } catch {
      send(500, { message: 'Billing records could not be read or saved. Check the local data folder and try again.' })
    }
  }
}

export function billingApiPlugin() {
  const middleware = createBillingMiddleware({ filePath: fileURLToPath(new URL('../.data/billing.json', import.meta.url)) })
  return { name: 'dummy-billing-api', configureServer(server) { server.middlewares.use(middleware) }, configurePreviewServer(server) { server.middlewares.use(middleware) } }
}
