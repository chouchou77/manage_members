const PROJECT_URL = 'https://skivttdfwlucytowupzl.supabase.co'
const TABLE = 'club_applications'

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  }
}

async function errorText(res) {
  try {
    const data = await res.json()
    return data?.message || data?.error_description || data?.error || res.statusText
  } catch {
    return res.statusText || 'خطأ غير متوقع'
  }
}

export async function fetchApplications(key) {
  const res = await fetch(
    `${PROJECT_URL}/rest/v1/${TABLE}?select=*&order=id.asc`,
    { headers: headers(key) },
  )
  if (!res.ok) throw new Error(await errorText(res))
  return res.json()
}

async function doPatch(key, id, body) {
  return fetch(`${PROJECT_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      ...headers(key),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

export async function updateApplication(key, id, patch) {
  let res = await doPatch(key, id, patch)

  if (!res.ok && Object.hasOwn(patch, 'teams')) {
    const current = Array.isArray(patch.teams) ? patch.teams[0] : patch.teams
    const fallback = Array.isArray(patch.teams) ? current : [current]
    res = await doPatch(key, id, { teams: fallback })
  }

  if (!res.ok) throw new Error(await errorText(res))
  return true
}
