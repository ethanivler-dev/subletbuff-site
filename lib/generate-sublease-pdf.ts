import jsPDF from 'jspdf'

interface SubleaseData {
  tenantName: string
  subtenantName: string
  landlordName: string
  landlordCompany: string | null
  propertyAddress: string
  startDate: string
  endDate: string
  monthlyRent: number
  securityDeposit: number
  rulesText: string | null
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generateSubleasePdf(data: SubleaseData): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 60
  const contentWidth = pageWidth - margin * 2
  let y = 60

  function addText(text: string, opts?: { bold?: boolean; size?: number; align?: 'left' | 'center' }) {
    const size = opts?.size ?? 11
    const font = opts?.bold ? 'helvetica' : 'helvetica'
    const style = opts?.bold ? 'bold' : 'normal'
    doc.setFont(font, style)
    doc.setFontSize(size)
    const align = opts?.align ?? 'left'
    const x = align === 'center' ? pageWidth / 2 : margin
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      if (y > 720) {
        doc.addPage()
        y = 60
      }
      doc.text(line, x, y, { align })
      y += size * 1.4
    }
  }

  function addLine() {
    y += 4
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 12
  }

  function addSpacer(pts = 12) {
    y += pts
  }

  // Title
  addText('SUBLEASE AGREEMENT', { bold: true, size: 18, align: 'center' })
  addSpacer(4)
  addText('State of Colorado', { size: 10, align: 'center' })
  addSpacer(8)
  addLine()

  // Parties
  addText('PARTIES', { bold: true, size: 12 })
  addSpacer(4)
  addText(`Original Tenant (Sublessor): ${data.tenantName}`)
  addText(`Subtenant (Sublessee): ${data.subtenantName}`)
  const landlordLabel = data.landlordCompany
    ? `${data.landlordName} (${data.landlordCompany})`
    : data.landlordName
  addText(`Landlord / Property Owner: ${landlordLabel}`)
  addSpacer()

  // Property
  addText('PROPERTY', { bold: true, size: 12 })
  addSpacer(4)
  addText(`The premises located at: ${data.propertyAddress}`)
  addSpacer()

  // Term
  addText('TERM OF SUBLEASE', { bold: true, size: 12 })
  addSpacer(4)
  addText(`This sublease shall commence on ${formatDate(data.startDate)} and terminate on ${formatDate(data.endDate)}.`)
  addSpacer()

  // Rent
  addText('RENT', { bold: true, size: 12 })
  addSpacer(4)
  addText(`The Subtenant agrees to pay ${formatCurrency(data.monthlyRent)} per month to the Original Tenant. Rent is due on the 1st of each month. Late payments may incur fees as specified in the original lease.`)
  addSpacer()

  // Deposit
  addText('SECURITY DEPOSIT', { bold: true, size: 12 })
  addSpacer(4)
  addText(`The Subtenant shall pay a security deposit of ${formatCurrency(data.securityDeposit)} prior to move-in. The deposit shall be returned within 30 days after the sublease ends, less any deductions for damages beyond normal wear and tear, in accordance with Colorado law (C.R.S. § 38-12-103).`)
  addSpacer()

  // Rules
  if (data.rulesText) {
    addText('PROPERTY RULES', { bold: true, size: 12 })
    addSpacer(4)
    addText(data.rulesText)
    addSpacer()
  }

  // Terms & Conditions
  addText('TERMS AND CONDITIONS', { bold: true, size: 12 })
  addSpacer(4)
  addText('1. The Subtenant agrees to comply with all terms and conditions of the original lease agreement between the Original Tenant and the Landlord.')
  addSpacer(2)
  addText('2. The Subtenant shall maintain the premises in good condition and shall be responsible for any damage caused during the sublease period.')
  addSpacer(2)
  addText('3. The Original Tenant remains liable to the Landlord under the original lease for the duration of the sublease.')
  addSpacer(2)
  addText('4. The Subtenant may not assign or further sublease the premises without written consent from both the Original Tenant and the Landlord.')
  addSpacer(2)
  addText('5. This sublease has been approved by the Landlord / Property Owner as indicated by their signature below.')
  addSpacer()

  // Landlord approval
  addText('LANDLORD APPROVAL', { bold: true, size: 12 })
  addSpacer(4)
  addText('The Landlord hereby consents to this sublease arrangement under the terms described above.')
  addSpacer(16)

  // Signatures
  addLine()
  addText('SIGNATURES', { bold: true, size: 12 })
  addSpacer(8)

  const sigSections = [
    { role: 'Original Tenant (Sublessor)', name: data.tenantName },
    { role: 'Subtenant (Sublessee)', name: data.subtenantName },
    { role: 'Landlord / Property Owner', name: landlordLabel },
  ]

  for (const sig of sigSections) {
    if (y > 660) {
      doc.addPage()
      y = 60
    }
    addText(`${sig.role}: ${sig.name}`, { size: 10 })
    addSpacer(24)
    doc.setDrawColor(150)
    doc.line(margin, y, margin + 240, y)
    doc.text('Signature', margin, y + 12)
    doc.line(margin + 280, y, margin + 400, y)
    doc.text('Date', margin + 280, y + 12)
    y += 28
    addSpacer(8)
  }

  // Footer
  addSpacer(8)
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Generated by SubletBuff — subletbuff.com', pageWidth / 2, 750, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
