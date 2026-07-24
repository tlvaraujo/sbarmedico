import { describe, expect, it } from 'vitest'
import { deidentify } from './deident'

describe('deidentify', () => {
  it('remove CPF', () => {
    const r = deidentify('Paciente com CPF 123.456.789-09 internado.')
    expect(r.text).toContain('[CPF]')
    expect(r.text).not.toContain('123.456.789-09')
    expect(r.total).toBe(1)
  })

  it('remove e-mail e telefone', () => {
    const r = deidentify('Contato: joao@ex.com, fone (11) 98765-4321.')
    expect(r.text).toContain('[EMAIL]')
    expect(r.text).toContain('[TEL]')
    expect(r.text).not.toContain('joao@ex.com')
    expect(r.text).not.toContain('98765-4321')
  })

  it('reduz número de prontuário', () => {
    const r = deidentify('Prontuário 456789 - evolução do dia.')
    expect(r.text).toContain('[Nº]')
    expect(r.text).not.toContain('456789')
  })

  it('preserva texto clínico sem identificadores', () => {
    const r = deidentify('PA 120/80 mmHg, SatO2 95%, glicemia 110.')
    expect(r.total).toBe(0)
    expect(r.text).toContain('PA 120/80')
  })
})
