import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = 'SubletBuff <support@subletbuff.com>'
const REPLY_TO = 'support@subletbuff.com'

function wrap(body: string): string {
  return `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;color:#1C1810;padding:24px">
  <img src="https://subletbuff.com/logo.png" alt="SubletBuff" style="height:32px;margin-bottom:24px" />
  ${body}
  <p style="margin-top:32px;font-size:0.8rem;color:#999">SubletBuff &middot; Boulder&rsquo;s student housing marketplace<br />subletbuff.com</p>
</div>`
}

const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging'

async function send(to: string, subject: string, html: string) {
  const taggedSubject = isStaging ? `[STAGING] ${subject}` : subject
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping:', taggedSubject, '→', to)
    return { success: false, reason: 'no_api_key' as const }
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to: [to], replyTo: REPLY_TO, subject: taggedSubject, html })
    if (error) {
      console.error('[email] Resend API error:', taggedSubject, '→', to, error)
      return { success: false, reason: 'api_error' as const, error }
    }
    return { success: true }
  } catch (err) {
    console.error('[email] Failed to send:', taggedSubject, '→', to, err)
    return { success: false, reason: 'exception' as const, error: err }
  }
}

export function sendEduVerificationEmail(email: string, code: string) {
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Verify your CU Boulder email</h2>
    <p>Enter this code on SubletBuff to verify your .edu email and earn the <strong>Verified Buff</strong> badge:</p>
    <div style="text-align:center;margin:24px 0">
      <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1C1810">${code}</span>
    </div>
    <p style="font-size:0.85rem;color:#666">This code expires in 10 minutes. If you didn&rsquo;t request this, you can safely ignore this email.</p>
  `)
  return send(email, 'Your SubletBuff verification code', html)
}

export function sendListingSubmittedEmail(email: string, name: string, title: string) {
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">We got your listing! Under review</h2>
    <p>Hi ${name},</p>
    <p>Thanks for posting on SubletBuff! Your listing <strong>&ldquo;${title}&rdquo;</strong> is under review.</p>
    <p>We review every listing to keep the platform safe and verified. You&rsquo;ll hear back within 24 hours.</p>
    <p>In the meantime, make sure your photos look great &mdash; listings with good photos get 3x more inquiries.</p>
    <p>&mdash; The SubletBuff Team</p>
  `)
  send(email, 'We got your listing! Under review', html).catch(() => {})
}

export function sendListingApprovedEmail(email: string, name: string, title: string, listingId: string) {
  const url = `https://subletbuff.com/listings/${listingId}`
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Your listing is live! 🎉</h2>
    <p>Hi ${name},</p>
    <p>Great news &mdash; your listing <strong>&ldquo;${title}&rdquo;</strong> has been approved and is now live on SubletBuff!</p>
    <p><a href="${url}" style="color:#B8922A;font-weight:600">View your listing &rarr;</a></p>
    <p>Tips to get subletter inquiries faster:</p>
    <ul style="padding-left:20px">
      <li>Share your listing on social media</li>
      <li>Respond to messages quickly</li>
      <li>Keep your dates and price up to date</li>
    </ul>
    <p>&mdash; The SubletBuff Team</p>
  `)
  send(email, 'Your listing is live! 🎉', html).catch(() => {})
}

export function sendListingRejectedEmail(email: string, name: string, title: string) {
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Update on your listing</h2>
    <p>Hi ${name},</p>
    <p>We reviewed your listing <strong>&ldquo;${title}&rdquo;</strong> and unfortunately it doesn&rsquo;t meet our guidelines at this time.</p>
    <p>Common reasons: incomplete information, unclear photos, or pricing that seems incorrect.</p>
    <p>You can edit and resubmit your listing anytime at <a href="https://subletbuff.com/account/listings" style="color:#B8922A">subletbuff.com/account/listings</a></p>
    <p>Questions? Reply to this email or contact <a href="mailto:support@subletbuff.com" style="color:#B8922A">support@subletbuff.com</a></p>
    <p>&mdash; The SubletBuff Team</p>
  `)
  send(email, 'Update on your listing', html).catch(() => {})
}

export function sendAdminContactEmail(email: string, name: string, title: string, listingId: string, reason: string, message: string) {
  const editUrl = `https://subletbuff.com/account/listings`
  const reasonLabels: Record<string, string> = {
    revision: 'Listing needs revision',
    missing_info: 'Missing information',
    photo_quality: 'Photo quality issue',
    price_issue: 'Price verification',
    custom: 'Message from SubletBuff',
  }
  const subject = reasonLabels[reason] ?? 'Message about your listing'
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">${subject}</h2>
    <p>Hi ${name},</p>
    <p>We&rsquo;re reaching out about your listing <strong>&ldquo;${title}&rdquo;</strong>:</p>
    <div style="background:#f9f9f6;border-left:3px solid #B8922A;padding:12px 16px;margin:16px 0;font-size:0.95rem">
      ${message.replace(/\n/g, '<br />')}
    </div>
    <p>You can update your listing at <a href="${editUrl}" style="color:#B8922A;font-weight:600">subletbuff.com/account/listings</a></p>
    <p>Questions? Reply to this email.</p>
    <p>&mdash; The SubletBuff Team</p>
  `)
  return send(email, `${subject}: "${title}"`, html)
}

export function sendNewInquiryEmail(email: string, listerName: string, senderName: string, listingTitle: string, messagePreview: string, conversationId: string) {
  const url = `https://subletbuff.com/messages/${conversationId}`
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Someone&rsquo;s interested in your place!</h2>
    <p>Hi ${listerName},</p>
    <p><strong>${senderName}</strong> is interested in your property <strong>&ldquo;${listingTitle}&rdquo;</strong> and sent you a message:</p>
    <div style="background:#f9f9f6;border-left:3px solid #B8922A;padding:12px 16px;margin:16px 0;font-size:0.95rem">
      ${messagePreview.replace(/\n/g, '<br />')}
    </div>
    <p><a href="${url}" style="display:inline-block;background:#B8922A;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reply on SubletBuff &rarr;</a></p>
    <p style="font-size:0.85rem;color:#666">Respond quickly &mdash; fast replies lead to more successful sublets!</p>
    <p>&mdash; The SubletBuff Team</p>
  `)
  send(email, `${senderName} is interested in "${listingTitle}"`, html).catch(() => {})
}

export function sendLeaseApprovedEmail(email: string, name: string, title: string, listingId: string) {
  const url = `https://subletbuff.com/listings/${listingId}`
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Lease verified!</h2>
    <p>Hi ${name},</p>
    <p>Your lease for <strong>&ldquo;${title}&rdquo;</strong> has been verified. Your listing now shows a &ldquo;Lease Verified&rdquo; badge!</p>
    <p><a href="${url}" style="color:#B8922A;font-weight:600">View your listing &rarr;</a></p>
    <p>&mdash; The SubletBuff Team</p>
  `)
  send(email, 'Lease verified!', html).catch(() => {})
}

export function sendLeaseRejectedEmail(email: string, name: string, title: string) {
  const html = wrap(`
    <h2 style="font-family:Georgia,serif;color:#B8922A;margin-top:0">Lease document update</h2>
    <p>Hi ${name},</p>
    <p>We reviewed the lease document for <strong>&ldquo;${title}&rdquo;</strong> and were unable to verify it.</p>
    <p>Common reasons: document is unclear, doesn&rsquo;t match the listing address, or is incomplete.</p>
    <p>You can upload a new document from your listing page.</p>
    <p>&mdash; The SubletBuff Team</p>
  `)
  send(email, 'Lease document update', html).catch(() => {})
}
