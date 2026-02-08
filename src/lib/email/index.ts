import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }

  return new Resend(apiKey)
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function getFromAddress() {
  return process.env.EMAIL_FROM ?? 'noreply@myquad.app'
}

export async function sendVerificationEmail(email: string, token: string) {
  const resend = getResendClient()
  const verifyLink = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`

  await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: 'Verify your MyQuad account',
    html: `<p>Welcome to MyQuad.</p><p>Verify your email by clicking <a href="${verifyLink}">this link</a>.</p>`,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = getResendClient()
  const resetLink = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`

  await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: 'Reset your MyQuad password',
    html: `<p>You requested a password reset.</p><p>Reset your password using <a href="${resetLink}">this link</a>.</p>`,
  })
}

export async function sendNotificationEmail(
  email: string,
  notification: {
    title: string
    message: string
    actionUrl?: string | null
  },
) {
  const resend = getResendClient()
  const actionLink = notification.actionUrl
    ? `${getAppUrl()}${notification.actionUrl}`
    : undefined

  await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: notification.title,
    html: `<p>${notification.message}</p>${actionLink ? `<p><a href="${actionLink}">View details</a></p>` : ''}`,
  })
}
