import { supabaseAdmin } from '@/lib/supabase-admin'

export async function logAdminAction({ admin_id, admin_name, action, target_id, metadata = {}, ip }) {
  try {
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: admin_id || null,
      admin_name: admin_name || 'Unknown',
      action,
      target_id: target_id ? String(target_id) : null,
      metadata,
      ip_address: ip || null,
    })
  } catch (e) {
    console.error('Audit log failed silently:', e)
  }
}

export const ACTIONS = {
  ADMIN_LOGIN:           'admin_login',
  ADMIN_LOGOUT:          'admin_logout',
  PIN_CHANGED:           'pin_changed',
  DRIVER_PASSWORD_RESET: 'driver_password_reset',
  DRIVER_ACTIVATED:      'driver_activated',
  DRIVER_DEACTIVATED:    'driver_deactivated',
  TICKET_APPROVED:       'ticket_approved',
  TICKET_REJECTED:       'ticket_rejected',
  CUSTOMER_ADDED:        'customer_added',
  CUSTOMER_TOGGLED:      'customer_toggled',
  LOCATION_ADDED:        'location_added',
  LOCATION_TOGGLED:      'location_toggled',
  MESSAGE_SENT:          'message_sent',
}
