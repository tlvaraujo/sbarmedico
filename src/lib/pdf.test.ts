import { describe, expect, it } from 'vitest'
import { pdfFilename, pdfLines } from './pdf'
import type { SbarDocument } from '../types/document'

function mk(o: Partial<SbarDocument> = {}): SbarDocument {
  return {
    id: '1',
    leito: '7B14',
    identificacao: 'R.R.R — 32a — 50 dias',
    proporcionalidade: 'suporte_invasivo',
    s: 'Pneumonia',
    b: ['Admissão D1 tosse+febre', 'ATB ceftriaxona D3'],
    a: ['PAC em melhora — desmame O2'],
    r: ['Manter ATB', 'Desmame de O2'],
    camposAusentes: [],
    createdAt: '2026-07-29T13:45:00.000Z',
    ...o,
  }
}

describe('pdfLines', () => {
  it('tem meta, S como seção e B/A/R como tópicos', () => {
    const lines = pdfLines(mk())
    const leito = lines.find((l) => l.kind === 'meta' && l.label === 'Leito')
    expect(leito?.kind === 'meta' && leito.value).toBe('7B14')
    const prop = lines.find((l) => l.kind === 'meta' && l.label.startsWith('Proporcionalidade'))
    expect(prop?.kind === 'meta' && prop.value).toBe('Suporte invasivo')
    const s = lines.find((l) => l.kind === 'section' && l.label.startsWith('S'))
    expect(s?.kind === 'section' && s.body).toBe('Pneumonia')
    const b = lines.find((l) => l.kind === 'bullets' && l.label.startsWith('B'))
    expect(b?.kind === 'bullets' && b.items).toEqual(['Admissão D1 tosse+febre', 'ATB ceftriaxona D3'])
    const r = lines.find((l) => l.kind === 'bullets' && l.label.startsWith('R'))
    expect(r?.kind === 'bullets' && r.items).toEqual(['Manter ATB', 'Desmame de O2'])
  })

  it('inclui o bloco de ausentes só quando há itens', () => {
    expect(pdfLines(mk()).some((l) => l.kind === 'warn')).toBe(false)
    const warn = pdfLines(mk({ camposAusentes: ['proporcionalidade não registrada'] })).find(
      (l) => l.kind === 'warn',
    )
    expect(warn?.kind === 'warn' && warn.items).toEqual(['proporcionalidade não registrada'])
  })
})

describe('pdfFilename', () => {
  it('monta um nome sanitizado com leito, iniciais e data/hora', () => {
    expect(pdfFilename(mk())).toBe('SBAR_7B14_R_R_R_2026-07-29_1345.pdf')
  })
  it('não deixa caracteres inválidos', () => {
    const f = pdfFilename(mk({ leito: '7/B 14', identificacao: 'J.S.@ — 60a' }))
    expect(f).not.toMatch(/[^\w.\-]/)
  })
})
