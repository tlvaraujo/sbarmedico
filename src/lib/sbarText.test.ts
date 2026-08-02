import { describe, expect, it } from 'vitest'
import { sbarToText } from './sbarText'
import type { SbarDocument } from '../types/document'

const doc: SbarDocument = {
  id: '1',
  leito: '7B14',
  identificacao: 'R.R.R — 32a — 15 dias',
  proporcionalidade: 'suporte_nao_invasivo',
  s: 'Paciente estável.',
  b: ['Pneumonia há 15 dias', 'ATB ceftriaxona D15'],
  a: ['Melhora clínica — desmame O2'],
  r: ['Verificar RX', 'Reavaliar antibiótico'],
  camposAusentes: [],
  createdAt: '2026-07-31T10:00:00.000Z',
}

describe('sbarToText', () => {
  it('monta o cabeçalho e as quatro seções', () => {
    const t = sbarToText(doc)
    expect(t).toContain('SBAR — Leito 7B14')
    expect(t).toContain('R.R.R — 32a — 15 dias')
    expect(t).toContain('Proporcionalidade: Suporte não invasivo individualizado')
    expect(t).toContain('S — Situação')
    expect(t).toContain('B — Background')
    expect(t).toContain('A — Avaliação')
    expect(t).toContain('R — Recomendação')
  })

  it('lista B e R em tópicos', () => {
    const t = sbarToText(doc)
    expect(t).toContain('• Pneumonia há 15 dias')
    expect(t).toContain('• Verificar RX')
    expect(t).toContain('• Reavaliar antibiótico')
  })

  it('usa — quando uma seção-lista está vazia', () => {
    const linhas = sbarToText({ ...doc, a: [] }).split('\n')
    const idxA = linhas.indexOf('A — Avaliação')
    expect(linhas[idxA + 1]).toBe('—')
  })

  it('inclui o bloco de ausentes só quando há itens', () => {
    expect(sbarToText(doc)).not.toContain('Não registrado no prontuário')
    const t = sbarToText({ ...doc, camposAusentes: ['proporcionalidade não registrada'] })
    expect(t).toContain('Não registrado no prontuário')
    expect(t).toContain('• proporcionalidade não registrada')
  })
})
