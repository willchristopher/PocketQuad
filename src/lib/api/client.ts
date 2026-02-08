export class ApiClientError extends Error {
  status: number
  details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
  }
}

type JsonInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof ReadableStream
  )
}

export async function apiRequest<T>(input: RequestInfo | URL, init: JsonInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  let body: BodyInit | undefined

  if (typeof init.body === 'undefined' || init.body === null) {
    body = undefined
  } else if (isBodyInit(init.body)) {
    body = init.body
  } else {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.body)
  }

  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers,
    body,
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as { data?: T; error?: string; issues?: unknown }) : {}

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      payload.error ?? `Request failed with status ${response.status}`,
      payload.issues,
    )
  }

  return payload.data as T
}
