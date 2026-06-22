export type TranslationStatus = 'pending' | 'complete' | 'failed'
export type AppointmentStatus = 'confirmed' | 'cancelled'
export type AppointmentSource = 'website' | 'external'
export type UserRole = 'admin' | 'developer'

export interface Profile {
  id: string
  role: UserRole
  created_at: string
}

export interface Barber {
  id: string
  name: string
  photo_url: string | null
  active: boolean
  // True for the owner/main barber — sorted first (is_owner DESC, name ASC).
  // No DB constraint limits this to one; multiple owners sort alphabetically among themselves.
  is_owner: boolean
  // ID of the Google Calendar linked to this barber (set by developer in /admin/integrations).
  google_calendar_id: string | null
  // WhatsApp number for barber notifications (international format, e.g. +32476000000).
  whatsapp_number: string | null
  created_at: string
}

export interface Service {
  id: string
  name_en: string
  description_en: string | null
  description_nl: string | null
  description_es: string | null
  price: number
  duration_minutes: number
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  barber_id: string
  service_id: string | null  // null for external (phone) appointments
  customer_name: string
  customer_phone: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  source: AppointmentSource
  google_calendar_event_id: string | null
  reminder_sent: boolean
  created_at: string
}

export interface ClosedDate {
  id: string
  barber_id: string | null  // null = hele zaak gesloten
  date: string              // ISO date string YYYY-MM-DD
  reason: string | null
  created_at: string
}

export interface OpeningHours {
  id: string
  day_of_week: number  // 0 = zondag, 6 = zaterdag
  opens_at: string | null
  closes_at: string | null
  closed: boolean
}

export interface BusinessSettings {
  id: 1
  phone: string | null
  address: string | null
  instagram_url: string | null
  google_maps_place_id: string | null
  updated_at: string
}
