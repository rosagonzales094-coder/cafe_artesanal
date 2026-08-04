async function parseJsonResponse(response) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'No fue posible completar la solicitud')
  }
  return data
}

export async function loginUser(apiUrl, credentials) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  return parseJsonResponse(response)
}

export async function registerUser(apiUrl, payload) {
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse(response)
}
