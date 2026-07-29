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
    b: 'Admissão 01/01 com tosse e febre.',
    a: 'Afebril, O2 1 L/min',
    r: ['Manter ATB', 'Desmame de O2'],
    createdAt: '2026-07-29T13:45:00.000Z',
    ...o,
  }
}

describe('pdfLines', () => {
  it('tem meta (leito/identificação/proporcionalidade), seções e bullets', () => {
    const lines = pdfLines(mk())
    expect(lines.map((l) => l.kind)).toContain('meta')
    const leito = lines.find((l) => l.kind === 'meta' && l.label === 'Leito')
    expect(leito?.kind === 'meta' && leito.value).toBe('7B14')
    const prop = lines.find((l) => l.kind === 'meta' && l.label.startsWith('Proporcionalidade'))
    expect(prop?.kind === 'meta' && prop.value).toBe('Suporte invasivo')
    const s = lines.find((l) => l.kind === 'section' && l.label.startsWith('S'))
    expect(s?.kind === 'section' && s.body).toBe('Pneumonia')
    const r = lines.find((l) => l.kind === 'bullets')
    expect(r?.kind === 'bullets' && r.items).toEqual(['Manter ATB', 'Desmame de O2'])
  })

  it('preserva "não informado no prontuário"', () => {
    const lines = pdfLines(mk({ a: 'não informado no prontuário' }))
    const a = lines.find((l) => l.kind === 'section' && l.label.startsWith('A'))
    expect(a?.kind === 'section' && a.body).toBe('não informado no prontuário')
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
