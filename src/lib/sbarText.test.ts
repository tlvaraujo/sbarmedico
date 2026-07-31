import { describe, expect, it } from 'vitest'
import { sbarToText } from './sbarText'
import type { SbarDocument } from '../types/document'

const doc: SbarDocument = {
  id: '1',
  leito: '7B14',
  identificacao: 'R.R.R — 32a — 15 dias',
  proporcionalidade: 'suporte_nao_invasivo',
  s: 'Paciente estável.',
  b: 'Pneumonia há 15 dias.',
  a: 'Melhora clínica.',
  r: ['Verificar RX', 'Reavaliar antibiótico'],
  createdAt: '2026-07-31T10:00:00.000Z',
}

describe('sbarToText', () => {
  it('monta o cabeçalho e as quatro seções', () => {
    const t = sbarToText(doc)
    expect(t).toContain('SBAR — Leito 7B14')
    expect(t).toContain('R.R.R — 32a — 15 dias')
    expect(t).toContain('Proporcionalidade: Suporte não invasivo individualizado')
    expect(t).toContain('S — Situação')
    expect(t).toContain('B — Breve histórico')
    expect(t).toContain('A — Avaliação')
    expect(t).toContain('R — Recomendação')
  })

  it('lista R em tópicos', () => {
    const t = sbarToText(doc)
    expect(t).toContain('• Verificar RX')
    expect(t).toContain('• Reavaliar antibiótico')
  })

  it('usa — quando uma seção está vazia', () => {
    const t = sbarToText({ ...doc, a: '', r: [] })
    // A seção A vazia e R sem itens viram "—"
    const linhas = t.split('\n')
    const idxA = linhas.indexOf('A — Avaliação')
    expect(linhas[idxA + 1]).toBe('—')
    const idxR = linhas.indexOf('R — Recomendação')
    expect(linhas[idxR + 1]).toBe('—')
  })
})
