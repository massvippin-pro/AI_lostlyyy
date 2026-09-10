import type { ApiEnvelope } from '@/types/lost-found'

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8000/api/v1'
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    const json = (await response.json()) as ApiEnvelope<T>

    if (!response.ok || !json.success) {
      const errorMsg = json?.error?.message || `Request failed with status ${response.status}`
      throw new Error(errorMsg)
    }

    return json.data
  } catch (err: any) {
    console.error(`API Error [${path}]:`, err)
    throw err
  }
}
