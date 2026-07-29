import { describe, expect, it } from 'vitest'
import { buildIntake } from './intake'

const txtFile = (content: string, name = 'prontuario.txt') =>
  new File([content], name, { type: 'text/plain' })

describe('buildIntake', () => {
  it('mescla texto colado + arquivo .txt e anonimiza o resultado', async () => {
    const file = txtFile('Paciente estável no leito. CPF 123.456.789-09.')
    const intake = await buildIntake([file], 'Colado: dispneia leve há 2 dias.')

    expect(intake.text).toContain('dispneia leve')
    expect(intake.text).toContain('Paciente estável')
    // deidentify roda sobre o texto mesclado
    expect(intake.text).toContain('[CPF]')
    expect(intake.text).not.toContain('123.456.789-09')
    expect(intake.images).toHaveLength(0)
    expect(intake.pdfs).toHaveLength(0)
    expect(intake.skipped).toHaveLength(0)
  })

  it('pula .doc legado e formatos não suportados (sem quebrar)', async () => {
    const legacy = new File(['x'], 'antigo.doc', { type: 'application/msword' })
    const other = new File(['x'], 'planilha.xlsx', { type: 'application/vnd.ms-excel' })
    const intake = await buildIntake([legacy, other], '')

    expect(intake.skipped).toEqual(['antigo.doc', 'planilha.xlsx'])
    expect(intake.text).toBe('')
    expect(intake.images).toHaveLength(0)
    expect(intake.pdfs).toHaveLength(0)
  })

  it('entrada vazia → tudo vazio', async () => {
    const intake = await buildIntake([], '   ')
    expect(intake).toEqual({ text: '', images: [], pdfs: [], skipped: [] })
  })
})
