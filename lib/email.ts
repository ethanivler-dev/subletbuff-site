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

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set, skipping email:', subject)
    return
  }
  try {
    await resend.emails.send({ from: FROM, to: [to], replyTo: REPLY_TO, subject, html })
  } catch (err) {
    console.error('[email] Failed to send:', subject, err)
  }
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
