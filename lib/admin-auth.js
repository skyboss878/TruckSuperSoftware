import { jwtVerify } from 'jose'

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
}

// Verify from request cookie (server-side)
export async function verifyAdmin(request) {
  try {
    const token = request.cookies?.get('admin_token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret())
    return payload // { admin_id, name, role }
  } catch {
    return null
  }
}

// Verify raw token string
export async function verifyAdminToken(token) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload
  } catch {
    return null
  }
}

export function requireRole(admin, roles = []) {
  if (!admin || !roles.includes(admin.role)) throw new Error('Forbidden')
}
