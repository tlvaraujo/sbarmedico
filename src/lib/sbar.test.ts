import { describe, expect, it } from 'vitest'
import { buildHandoffText, buildSbarText } from './sbar'
import type { Patient } from '../types/patient'

function make(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    bed: '12',
    initials: 'J.S.',
    fullName: '',
    age: 64,
    sex: 'M',
    recordNumber: '',
    admissionDate: '',
    mainDiagnosis: 'PNM comunitária',
    comorbidities: [],
    allergies: 'Nega',
    devices: [],
    pending: [],
    watchParams: '',
    alertSigns: '',
    stability: 'estavel',
    careLevel: 'nao_definido',
    sbar: { situacao: '', historico: '', avaliacao: '', recomendacao: '' },
    pinned: false,
    archived: false,
    ...overrides,
  }
}

describe('buildSbarText', () => {
  it('monta o cabeçalho com leito, iniciais, demografia e status', () => {
    const t = buildSbarText(make())
    expect(t).toContain('Leito 12 | J.S. | 64a M | Estável')
    expect(t).toContain('Dx: PNM comunitária')
  })

  it('omite completamente linhas de campos vazios (sem rótulos soltos)', () => {
    const t = buildSbarText(make())
    expect(t).not.toContain('S (Situação):')
    expect(t).not.toContain('Pendências:')
    expect(t).not.toContain('Dispositivos:')
    expect(t).not.toContain('Vigiar:')
  })

  it('inclui as quatro seções do SBAR quando preenchidas, na ordem certa', () => {
    const t = buildSbarText(
      make({
        sbar: {
          situacao: 'Dessaturando',
          historico: 'Internado há 3 dias por PNM',
          avaliacao: 'Piora respiratória',
          recomendacao: 'Aumentar O2, colher gaso',
        },
      }),
    )
    const iS = t.indexOf('S (Situação):')
    const iB = t.indexOf('B (Breve histórico):')
    const iA = t.indexOf('A (Avaliação):')
    const iR = t.indexOf('R (Conduta):')
    expect(iS).toBeGreaterThan(-1)
    expect(iB).toBeGreaterThan(iS)
    expect(iA).toBeGreaterThan(iB)
    expect(iR).toBeGreaterThan(iA)
  })

  it('lista apenas pendências em aberto', () => {
    const t = buildSbarText(
      make({
        pending: [
          { id: 'a', kind: 'exame', text: 'TC de tórax', done: false },
          { id: 'b', kind: 'parecer', text: 'Parecer CTI', done: true },
        ],
      }),
    )
    expect(t).toContain('Pendências: TC de tórax')
    expect(t).not.toContain('Parecer CTI')
  })

  it('formata dispositivos com detalhe entre parênteses', () => {
    const t = buildSbarText(
      make({ devices: [{ id: 'd', type: 'AVC', detail: 'jugular D, D2' }] }),
    )
    expect(t).toContain('Dispositivos: AVC (jugular D, D2)')
  })

  it('mostra nível de cuidado só quando diferente de "não definido"', () => {
    expect(buildSbarText(make())).not.toContain('Nível de cuidado')
    expect(buildSbarText(make({ careLevel: 'nao_reanimar' }))).toContain(
      'Nível de cuidado: Não reanimar (ONR)',
    )
  })

  it('formato compacto usa rótulos curtos e sem linhas em branco', () => {
    const t = buildSbarText(
      make({ sbar: { situacao: 'Estável', historico: '', avaliacao: '', recomendacao: '' } }),
      'compact',
    )
    expect(t).toContain('S: Estável')
    expect(t).not.toContain('\n\n')
  })
})

describe('buildHandoffText', () => {
  it('ordena os pacientes por leito (ordem natural) e conta o total', () => {
    const t = buildHandoffText([
      make({ id: '1', bed: '10', initials: 'A.A.' }),
      make({ id: '2', bed: '2', initials: 'B.B.' }),
    ])
    expect(t).toContain('Pacientes: 2')
    expect(t.indexOf('B.B.')).toBeLessThan(t.indexOf('A.A.'))
  })

  it('inclui turno e autor no cabeçalho quando informados', () => {
    const t = buildHandoffText([make()], { shift: 'Noturno', author: 'Dra. X' })
    expect(t).toContain('Turno: Noturno')
    expect(t).toContain('Médico(a): Dra. X')
  })
})
