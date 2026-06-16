// In-memory rate limiter — works across Vercel serverless warm instances
// For PIN brute-force protection on admin auth

const attempts = new Map()

export function rateLimit(key, { max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now()
  const record = attempts.get(key) || { count: 0, resetAt: now + windowMs }

  // Reset window if expired
  if (now > record.resetAt) {
    record.count = 0
    record.resetAt = now + windowMs
  }

  record.count++
  attempts.set(key, record)

  const remaining = Math.max(0, max - record.count)
  const blocked = record.count > max
  const retryAfter = Math.ceil((record.resetAt - now) / 1000)

  return { blocked, remaining, retryAfter, count: record.count }
}

export function clearLimit(key) {
  attempts.delete(key)
}
