async function request(path, options) {
  let response
  try {
    response = await fetch(`/api/billing${path}`, options)
  } catch {
    throw new Error('The billing service is unavailable. Check the local server and try again. Your entries have been kept.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || !body) {
    const error = new Error(body?.message || 'Billing information could not be processed. Please try again.')
    error.fields = body?.errors
    throw error
  }
  return body
}

export const billingApi = {
  list: studentId => request(`?studentId=${encodeURIComponent(studentId)}`),
  save: bill => request(bill.id ? `/${encodeURIComponent(bill.id)}` : '', {
    method: bill.id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  }),
}
