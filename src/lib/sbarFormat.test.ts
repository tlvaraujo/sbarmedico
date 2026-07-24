import { describe, expect, it } from 'vitest'
import {
  criticalCount,
  sortPatients,
  toPlainText,
  toWhatsApp,
  toWhatsAppAll,
} from './sbarFormat'
import type { SbarPatient } from './generate'

function mk(o: Partial<SbarPatient> = {}): SbarPatient {
  return {
    leito: '12',
    iniciais: 'J.S.',
    situation: '',
    background: '',
    assessment: '',
    recommendation: '',
    alert: '',
    ...o,
  }
}

describe('sbarFormat', () => {
  it('ordena críticos primeiro, depois por leito natural', () => {
    const s = sortPatients([
      mk({ leito: '10', iniciais: 'A' }),
      mk({ leito: '2', iniciais: 'B' }),
      mk({ leito: '20', iniciais: 'C', alert: 'PCR iminente' }),
    ])
    expect(s.map((p) => p.iniciais)).toEqual(['C', 'B', 'A'])
  })

  it('criticalCount conta só quem tem alert não vazio', () => {
    expect(criticalCount([mk(), mk({ alert: 'x' }), mk({ alert: '   ' })])).toBe(1)
  })

  it('toWhatsApp: cabeçalho, leito, 4 seções e rodapé exato', () => {
    const t = toWhatsApp(
      mk({ situation: 'Dispneia', background: 'ICC', assessment: 'Piora', recommendation: '• Colher gaso' }),
    )
    expect(t).toContain('🏥 *Passagem de Plantão*')
    expect(t).toContain('*Leito 12 · J.S.*')
    expect(t).toContain('🔵 *Situação (S)*')
    expect(t).toContain('🟢 *Contexto (B)*')
    expect(t).toContain('🟡 *Avaliação (A)*')
    expect(t).toContain('🔴 *Recomendações (R)*')
    expect(t).toContain('_Gerado por SBAR Médico · Alpha_')
    expect(t).not.toContain('🚨')
    expect(t).not.toContain('ATENÇÃO')
  })

  it('toWhatsApp: crítico mostra 🚨 e bloco ATENÇÃO', () => {
    const t = toWhatsApp(mk({ alert: 'Instável, PA 70x40' }))
    expect(t).toContain('🚨')
    expect(t).toContain('⚠️ *ATENÇÃO:* Instável, PA 70x40')
  })

  it('toPlainText omite campos vazios', () => {
    const t = toPlainText(mk({ situation: 'x' }))
    expect(t).toContain('S (Situação): x')
    expect(t).not.toContain('B (Contexto)')
    expect(t).not.toContain('ATENÇÃO')
  })

  it('toWhatsAppAll: exatamente um cabeçalho e um rodapé', () => {
    const t = toWhatsAppAll([mk({ situation: 'a' }), mk({ leito: '15', iniciais: 'M', situation: 'b' })])
    expect(t.match(/🏥 \*Passagem de Plantão\*/g)?.length).toBe(1)
    expect(t.match(/_Gerado por SBAR Médico · Alpha_/g)?.length).toBe(1)
  })
})
