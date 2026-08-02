import type { jsPDF as JsPdfDoc } from 'jspdf'
import type { SbarDocument } from '../types/document'
import { PROPORCIONALIDADE_LABEL } from '../types/document'
import { formatDateTime } from './format'

// jsPDF é carregado sob demanda (import dinâmico) para não pesar o bundle inicial.

export type PdfLine =
  | { kind: 'meta'; label: string; value: string }
  | { kind: 'section'; label: string; body: string }
  | { kind: 'bullets'; label: string; items: string[] }
  | { kind: 'warn'; label: string; items: string[] }

/** Estrutura pura e testável do corpo do documento (sem jsPDF). */
export function pdfLines(d: SbarDocument): PdfLine[] {
  const lines: PdfLine[] = [
    { kind: 'meta', label: 'Leito', value: d.leito || '—' },
    { kind: 'meta', label: 'Identificação', value: d.identificacao || '—' },
    {
      kind: 'meta',
      label: 'Proporcionalidade terapêutica',
      value: PROPORCIONALIDADE_LABEL[d.proporcionalidade],
    },
    { kind: 'section', label: 'S — Situação', body: d.s },
    { kind: 'bullets', label: 'B — Background', items: d.b },
    { kind: 'bullets', label: 'A — Avaliação', items: d.a },
    { kind: 'bullets', label: 'R — Recomendação', items: d.r },
  ]
  if (d.camposAusentes.length) {
    lines.push({ kind: 'warn', label: 'Não registrado no prontuário', items: d.camposAusentes })
  }
  return lines
}

export function pdfFilename(d: SbarDocument): string {
  const iniciais = (d.identificacao.split(/[—,\-]/)[0] ?? '').trim()
  const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const date = d.createdAt.slice(0, 10)
  const time = d.createdAt.slice(11, 16).replace(':', '')
  return `SBAR_${safe(d.leito) || 'leito'}_${safe(iniciais) || 'paciente'}_${date}_${time}.pdf`
}

const M = 15 // margem (mm)

function drawDocument(pdf: JsPdfDoc, d: SbarDocument): void {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const contentW = pageW - M * 2
  let y = M

  const ensure = (need: number) => {
    if (y + need > pageH - 18) {
      pdf.addPage()
      y = M
    }
  }

  // Cabeçalho
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(15, 129, 104)
  pdf.text('SBAR Médico', M, y + 4)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  pdf.text(formatDateTime(d.createdAt), pageW - M, y + 4, { align: 'right' })
  y += 9
  pdf.setDrawColor(220, 220, 220)
  pdf.setLineWidth(0.3)
  pdf.line(M, y, pageW - M, y)
  y += 6

  for (const ln of pdfLines(d)) {
    if (ln.kind === 'meta') {
      pdf.setFontSize(10)
      pdf.setTextColor(30, 30, 30)
      pdf.setFont('helvetica', 'bold')
      const label = `${ln.label}: `
      const labelW = pdf.getTextWidth(label)
      const valueLines = pdf.splitTextToSize(ln.value, contentW - labelW) as string[]
      ensure(5 * valueLines.length)
      pdf.text(label, M, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(valueLines, M + labelW, y)
      y += 5 * valueLines.length + 1
    } else if (ln.kind === 'section') {
      ensure(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(15, 129, 104)
      pdf.text(ln.label, M, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10.5)
      pdf.setTextColor(30, 30, 30)
      const bl = pdf.splitTextToSize(ln.body.trim() || '—', contentW) as string[]
      ensure(5 * bl.length)
      pdf.text(bl, M, y)
      y += 5 * bl.length + 3
    } else {
      // bullets (B/A/R) ou warn (campos ausentes) — warn em âmbar
      const warn = ln.kind === 'warn'
      ensure(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      if (warn) pdf.setTextColor(180, 83, 9)
      else pdf.setTextColor(15, 129, 104)
      pdf.text(ln.label, M, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10.5)
      if (warn) pdf.setTextColor(146, 64, 14)
      else pdf.setTextColor(30, 30, 30)
      const items = ln.items.length ? ln.items : ['—']
      for (const it of items) {
        const bl = pdf.splitTextToSize(it, contentW - 5) as string[]
        ensure(5 * bl.length)
        pdf.text('•', M, y)
        pdf.text(bl, M + 5, y)
        y += 5 * bl.length + 1
      }
      y += 2
    }
  }
}

function drawFooters(pdf: JsPdfDoc): void {
  const pages = pdf.getNumberOfPages()
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text('SBAR Médico — documento gerado por IA, confira antes de usar.', M, pageH - 8)
    pdf.text(`${i}/${pages}`, pageW - M, pageH - 8, { align: 'right' })
  }
}

async function newPdf(): Promise<JsPdfDoc> {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4' })
}

async function renderSingle(d: SbarDocument): Promise<JsPdfDoc> {
  const pdf = await newPdf()
  drawDocument(pdf, d)
  drawFooters(pdf)
  return pdf
}

export async function downloadSingle(d: SbarDocument): Promise<void> {
  const pdf = await renderSingle(d)
  pdf.save(pdfFilename(d))
}

/**
 * Compartilha o PDF pela folha nativa do sistema (WhatsApp, e-mail, etc.).
 * Sem suporte a compartilhar arquivo (ex.: desktop) → baixa o PDF.
 */
export async function sharePdf(d: SbarDocument): Promise<'shared' | 'downloaded'> {
  const pdf = await renderSingle(d)
  const name = pdfFilename(d)
  const file = new File([pdf.output('blob')], name, { type: 'application/pdf' })

  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'SBAR Médico',
          text: `SBAR — Leito ${d.leito || '—'}`,
        })
        return 'shared'
      }
    } catch (e) {
      // Usuário cancelou a folha de compartilhamento → não faz fallback.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared'
    }
  }

  pdf.save(name)
  return 'downloaded'
}

export async function downloadBatch(docs: SbarDocument[]): Promise<void> {
  const pdf = await newPdf()
  docs.forEach((d, i) => {
    if (i > 0) pdf.addPage()
    drawDocument(pdf, d)
  })
  drawFooters(pdf)
  const date = new Date().toISOString().slice(0, 10)
  pdf.save(`SBAR_lote_${date}.pdf`)
}
