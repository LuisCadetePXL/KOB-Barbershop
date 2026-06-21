import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'

// Required environment variables:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — e.g. kob-calendar@your-project.iam.gserviceaccount.com
//   GOOGLE_PRIVATE_KEY           — the private_key field from the service account JSON,
//                                  with literal \n characters (store as-is in .env.local)

function getCalendar() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // .env stores \n as the two-character sequence \\n — convert back to real newlines
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

// Private extended property added to every event created by the website.
// The cron sync uses this to distinguish website events from barber-created events.
export const KOB_SOURCE_MARKER = 'kob_website'

export async function createCalendarEvent(params: {
  calendarId: string
  summary: string
  appointmentId: string
  startTime: Date
  endTime: Date
}): Promise<string | null> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error('[KOB Calendar] createCalendarEvent skipped: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY not set in environment.')
    return null
  }
  try {
    const cal = getCalendar()
    const res = await cal.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.summary,
        start: { dateTime: params.startTime.toISOString() },
        end:   { dateTime: params.endTime.toISOString() },
        extendedProperties: {
          private: {
            source:         KOB_SOURCE_MARKER,
            appointment_id: params.appointmentId,
          },
        },
      },
    })
    console.log(`[KOB Calendar] Event created: ${res.data.id} in calendar ${params.calendarId}`)
    return res.data.id ?? null
  } catch (err) {
    console.error('[KOB Calendar] createCalendarEvent failed:', err)
    return null
  }
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  try {
    const cal = getCalendar()
    await cal.events.delete({ calendarId, eventId })
  } catch {
    // Event may already have been deleted — treat as success
  }
}

export type CalendarEvent = calendar_v3.Schema$Event

export async function listCalendarEvents(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  try {
    const cal = getCalendar()
    const res = await cal.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    })
    return res.data.items ?? []
  } catch {
    return []
  }
}
