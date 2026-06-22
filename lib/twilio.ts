// Twilio WhatsApp helper — uses the Twilio REST API directly (no SDK needed).
//
// Required env vars:
//   TWILIO_ACCOUNT_SID   — starts with AC...
//   TWILIO_AUTH_TOKEN    — from Twilio Console dashboard
//   TWILIO_WHATSAPP_FROM — e.g. whatsapp:+14155238886 (sandbox) or whatsapp:+32... (production)

/**
 * Sends a WhatsApp message via Twilio.
 * `to` must be in international format, e.g. +32476000000 (without whatsapp: prefix).
 * Returns true on success, false on failure (errors are logged, never thrown).
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    console.error('[KOB WhatsApp] Skipped: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_FROM not set')
    return false
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams({
    From: from,
    To:   `whatsapp:${to}`,
    Body: body,
  })

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[KOB WhatsApp] Send failed (${res.status}):`, text)
      return false
    }

    const data = await res.json() as { sid?: string }
    console.log(`[KOB WhatsApp] Sent to ${to}, SID: ${data.sid}`)
    return true
  } catch (err) {
    console.error('[KOB WhatsApp] Send error:', err)
    return false
  }
}

// ── Message formatters ────────────────────────────────────────────────────────

export function barberNotificationMessage(params: {
  customerName: string
  serviceName: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM (Brussels local, as entered by user)
  customerPhone: string
}): string {
  const dateFormatted = new Date(`${params.date}T12:00:00Z`).toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'UTC',
  })
  return [
    '🔔 Nieuwe afspraak — KOB',
    '',
    `👤 ${params.customerName}`,
    `✂️  ${params.serviceName}`,
    `📅 ${dateFormatted} · ${params.time}`,
    `📞 ${params.customerPhone}`,
  ].join('\n')
}

export function customerReminderMessage(params: {
  customerName: string
  serviceName: string
  barberName: string
  time: string        // HH:MM (Brussels local)
}): string {
  return [
    '📅 Herinnering — K.O.B. Barbershop',
    '',
    `Hallo ${params.customerName}, je hebt morgen een afspraak:`,
    `✂️  ${params.serviceName} bij ${params.barberName}`,
    `🕐 ${params.time}`,
    '📍 Maarschalk Fochstraat 5, Leopoldsburg',
    '',
    'Tot morgen!',
  ].join('\n')
}
