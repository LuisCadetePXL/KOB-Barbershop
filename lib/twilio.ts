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
    console.error('[KOB WhatsApp] Skipped — missing env vars:', {
      hasSid:   !!accountSid,
      hasToken: !!authToken,
      hasFrom:  !!from,
    })
    return false
  }
  console.log(`[KOB WhatsApp] Sending to ${to} from ${from}`)

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

    const data = await res.json() as { sid?: string; status?: string; error_message?: string }
    if (data.error_message) {
      console.error(`[KOB WhatsApp] Twilio error: ${data.error_message}`)
      return false
    }
    console.log(`[KOB WhatsApp] Sent to ${to} ✓ SID: ${data.sid} status: ${data.status}`)
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

export function customerConfirmationMessage(params: {
  customerName: string
  serviceName: string
  barberName: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM Brussels local
  cancelUrl: string
}): string {
  const dateFormatted = new Date(`${params.date}T12:00:00Z`).toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'UTC',
  })
  return [
    '✅ Afspraak bevestigd — K.O.B. Barbershop',
    '',
    `Hallo ${params.customerName}, je afspraak is bevestigd!`,
    `✂️  ${params.serviceName} bij ${params.barberName}`,
    `📅 ${dateFormatted} · ${params.time}`,
    '📍 Maarschalk Fochstraat 5, Leopoldsburg',
    '',
    'Annuleren kan tot 1,5 uur voor aanvang via:',
    params.cancelUrl,
    '',
    'Bij te late annulering is de helft van de prijs verschuldigd.',
  ].join('\n')
}

export function barberCancellationMessage(params: {
  customerName: string
  serviceName: string
  date: string
  time: string
}): string {
  const dateFormatted = new Date(`${params.date}T12:00:00Z`).toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'UTC',
  })
  return [
    '🚫 Annulering — KOB',
    '',
    `${params.customerName} heeft zijn afspraak geannuleerd.`,
    `✂️  ${params.serviceName}`,
    `📅 ${dateFormatted} · ${params.time}`,
  ].join('\n')
}

export function barberLateCancellationMessage(params: {
  customerName: string
  serviceName: string
  date: string
  time: string
  customerPhone: string
  amountOwed: number
}): string {
  const dateFormatted = new Date(`${params.date}T12:00:00Z`).toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'UTC',
  })
  return [
    '⚠️ Te late annulering — KOB',
    '',
    `${params.customerName} heeft te laat geannuleerd.`,
    `✂️  ${params.serviceName}`,
    `📅 ${dateFormatted} · ${params.time}`,
    `📞 ${params.customerPhone}`,
    `💶 Verschuldigd: €${params.amountOwed.toFixed(2)}`,
    'Naam en nummer zijn opgeslagen.',
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
