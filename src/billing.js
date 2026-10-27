// Shared by the form and the dummy API. Money is calculated in centavos.
export const services = ['Behavior therapy', 'Speech therapy', 'Occupational therapy', 'Family guidance']

export function todayInManila() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = name => parts.find(value => value.type === name).value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function emptyBill(studentId) {
  const today = todayInManila()
  return { studentId, periodStart: today.slice(0, 8) + '01', periodEnd: today, issueDate: today, dueDate: '', items: [{ service: '', description: '', sessions: '', rate: '' }], notes: '', reviewed: false }
}

export function toCentavos(value) {
  const text = String(value ?? '')
  if (!/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(text)) return null
  const [pesos, fraction = ''] = text.split('.')
  return Number(pesos) * 100 + Number(fraction.padEnd(2, '0'))
}

export function totalCentavos(items = []) {
  return items.reduce((total, item) => {
    const rate = toCentavos(item.rate)
    const sessions = Number(item.sessions)
    return rate !== null && Number.isInteger(sessions) && sessions >= 1 && sessions <= 1000 ? total + rate * sessions : total
  }, 0)
}

export function formatMoney(centavos) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(centavos / 100)
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value >= '2000-01-01' && value <= '2100-12-31'
}

export function validateBill(bill, amountPaidCentavos = 0) {
  const errors = {}
  if (typeof bill?.studentId !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(bill.studentId)) errors.studentId = 'Select a student profile.'
  for (const [key, label] of [['periodStart', 'billing period start'], ['periodEnd', 'billing period end'], ['issueDate', 'issue date'], ['dueDate', 'payment due date']]) {
    if (!validDate(bill?.[key])) errors[key] = `Enter a valid ${label} between 2000 and 2100.`
  }
  if (!errors.periodStart && !errors.periodEnd && bill.periodEnd < bill.periodStart) errors.periodEnd = 'The billing period end must be on or after its start.'
  if (!errors.issueDate && !errors.dueDate && bill.dueDate < bill.issueDate) errors.dueDate = 'The payment due date must be on or after the issue date.'
  if (!Array.isArray(bill?.items) || bill.items.length < 1 || bill.items.length > 20) errors.items = 'Include between 1 and 20 session charges.'
  else bill.items.forEach((item, index) => {
    const key = name => `items.${index}.${name}`
    if (!services.includes(item?.service)) errors[key('service')] = 'Choose a therapy service.'
    if (typeof item?.description !== 'string' || item.description.trim().length < 3 || item.description.trim().length > 120) errors[key('description')] = 'Enter a description of 3 to 120 characters.'
    if (!/^\d{1,4}$/.test(String(item?.sessions ?? '')) || !Number.isInteger(Number(item.sessions)) || Number(item.sessions) < 1 || Number(item.sessions) > 1000) errors[key('sessions')] = 'Enter a whole number of sessions from 1 to 1,000.'
    const rate = toCentavos(item?.rate)
    if (rate === null || rate < 1 || rate > 10000000) errors[key('rate')] = 'Enter a rate from ₱0.01 to ₱100,000 with at most 2 decimal places.'
  })
  if (typeof bill?.notes !== 'string' || bill.notes.length > 1000) errors.notes = 'Keep billing notes to 1,000 characters or fewer.'
  if (bill?.reviewed !== true) errors.reviewed = 'Confirm that you have reviewed the billing information.'
  if (!Object.keys(errors).some(key => key.startsWith('items')) && totalCentavos(bill.items) < amountPaidCentavos) errors.items = 'Total charges cannot be lower than payments already recorded.'
  return errors
}

export function billingStatus(record, today = todayInManila()) {
  if (record.totalCentavos <= record.amountPaidCentavos) return 'Paid'
  return record.dueDate < today ? 'Overdue' : 'Pending'
}
