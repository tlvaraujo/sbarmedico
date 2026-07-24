import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { createEmptyPatient, putPatient, usePatient } from '../db/patients'
import type { Patient, StabilityStatus } from '../types/patient'
import { useMeta } from '../db/meta'
import { CARE_LEVEL_OPTIONS, SEX_OPTIONS } from '../lib/labels'
import { BackButton, Button, Field, PageHeader, inputClass } from '../components/ui'
import {
  ChipInput,
  DeviceEditor,
  PendingEditor,
  Section,
  Segmented,
} from '../components/inputs'
import { useToast } from '../components/Toast'

const textareaClass = `${inputClass} min-h-[4.5rem] resize-y leading-snug`

const STABILITY_SEGMENTS: {
  value: StabilityStatus
  label: string
  activeClass: string
}[] = [
  { value: 'estavel', label: 'Estável', activeClass: 'bg-emerald-500 text-white shadow-sm' },
  { value: 'atencao', label: 'Atenção', activeClass: 'bg-amber-500 text-white shadow-sm' },
  { value: 'instavel', label: 'Instável', activeClass: 'bg-red-500 text-white shadow-sm' },
]

export function PatientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const existing = usePatient(id)
  const [showFullName] = useMeta('showFullName', false)

  const [patient, setPatient] = useState<Patient | null>(null)
  const dirty = useRef(false)
  const latest = useRef<Patient | null>(null)

  // Inicializa: novo (form vazio) ou carrega o existente.
  useEffect(() => {
    if (patient) return
    if (!id) setPatient(createEmptyPatient())
    else if (existing) setPatient(existing)
  }, [id, existing, patient])

  useEffect(() => {
    latest.current = patient
  }, [patient])

  // Autosave com debounce — só depois de a usuária editar algo.
  useEffect(() => {
    if (!patient || !dirty.current) return
    const t = setTimeout(() => void putPatient(patient), 500)
    return () => clearTimeout(t)
  }, [patient])

  // Garante o último salvamento ao sair da tela.
  useEffect(() => {
    return () => {
      if (dirty.current && latest.current) void putPatient(latest.current)
    }
  }, [])

  function update(patch: Partial<Patient>) {
    dirty.current = true
    setPatient((p) => (p ? { ...p, ...patch } : p))
  }
  function updateSbar(patch: Partial<Patient['sbar']>) {
    dirty.current = true
    setPatient((p) => (p ? { ...p, sbar: { ...p.sbar, ...patch } } : p))
  }

  function finish() {
    const p = latest.current
    if (dirty.current && p) {
      void putPatient(p)
      toast.show('Paciente salvo')
      navigate(`/sbar/${p.id}`)
    } else {
      navigate('/')
    }
  }

  if (!patient) {
    return (
      <div>
        <PageHeader title={id ? 'Editar' : 'Novo paciente'} left={<BackButton />} />
        <p className="p-6 text-center text-sm text-slate-500">Carregando…</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={id ? 'Editar paciente' : 'Novo paciente'}
        left={<BackButton />}
        right={
          <Button onClick={finish} className="px-3">
            <Check className="h-4 w-4" /> Concluir
          </Button>
        }
      />

      <div className="px-3">
        <Section title="Essencial" defaultOpen>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Leito">
              <input
                value={patient.bed}
                onChange={(e) => update({ bed: e.target.value })}
                placeholder="Ex.: 12A"
                autoFocus={!id}
                className={inputClass}
              />
            </Field>
            <Field label="Iniciais">
              <input
                value={patient.initials}
                onChange={(e) => update({ initials: e.target.value })}
                placeholder="Ex.: J.S."
                className={inputClass}
              />
            </Field>
          </div>

          {showFullName && (
            <Field label="Nome completo" hint="Mais sensível — use só se necessário.">
              <input
                value={patient.fullName ?? ''}
                onChange={(e) => update({ fullName: e.target.value })}
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Diagnóstico principal">
            <input
              value={patient.mainDiagnosis}
              onChange={(e) => update({ mainDiagnosis: e.target.value })}
              placeholder="Ex.: Pneumonia comunitária"
              className={inputClass}
            />
          </Field>

          <Field label="Estabilidade">
            <Segmented
              value={patient.stability}
              onChange={(v) => update({ stability: v })}
              options={STABILITY_SEGMENTS}
            />
          </Field>

          <Field label="Alergias">
            <input
              value={patient.allergies}
              onChange={(e) => update({ allergies: e.target.value })}
              placeholder='Ex.: "Nega" ou "Dipirona"'
              className={inputClass}
            />
          </Field>
        </Section>

        <Section title="SBAR" defaultOpen>
          <Field label="S — Situação" hint="Problema/queixa atual.">
            <textarea
              value={patient.sbar.situacao}
              onChange={(e) => updateSbar({ situacao: e.target.value })}
              className={textareaClass}
            />
          </Field>
          <Field label="B — Breve histórico">
            <textarea
              value={patient.sbar.historico}
              onChange={(e) => updateSbar({ historico: e.target.value })}
              className={textareaClass}
            />
          </Field>
          <Field label="A — Avaliação">
            <textarea
              value={patient.sbar.avaliacao}
              onChange={(e) => updateSbar({ avaliacao: e.target.value })}
              className={textareaClass}
            />
          </Field>
          <Field label="R — Conduta / recomendação">
            <textarea
              value={patient.sbar.recomendacao}
              onChange={(e) => updateSbar({ recomendacao: e.target.value })}
              className={textareaClass}
            />
          </Field>
        </Section>

        <Section title="Identificação e internação">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Idade">
              <input
                value={patient.age ?? ''}
                onChange={(e) =>
                  update({ age: e.target.value === '' ? null : Number(e.target.value) })
                }
                inputMode="numeric"
                placeholder="anos"
                className={inputClass}
              />
            </Field>
            <Field label="Sexo">
              <select
                value={patient.sex ?? ''}
                onChange={(e) => update({ sex: e.target.value as Patient['sex'] })}
                className={inputClass}
              >
                {SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de internação">
              <input
                type="date"
                value={patient.admissionDate ?? ''}
                onChange={(e) => update({ admissionDate: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Prontuário/atend.">
              <input
                value={patient.recordNumber ?? ''}
                onChange={(e) => update({ recordNumber: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <Section title="Comorbidades e nível de cuidado">
          <Field label="Comorbidades" hint="Enter ou vírgula para adicionar.">
            <ChipInput
              value={patient.comorbidities}
              onChange={(v) => update({ comorbidities: v })}
              placeholder="Ex.: HAS, DM2, DPOC"
            />
          </Field>
          <Field label="Nível de cuidado">
            <select
              value={patient.careLevel}
              onChange={(e) => update({ careLevel: e.target.value as Patient['careLevel'] })}
              className={inputClass}
            >
              {CARE_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Dispositivos e pendências">
          <Field label="Dispositivos" hint="Acessos, sondas, drenos, O2…">
            <DeviceEditor
              value={patient.devices}
              onChange={(v) => update({ devices: v })}
            />
          </Field>
          <Field label="Pendências">
            <PendingEditor
              value={patient.pending}
              onChange={(v) => update({ pending: v })}
            />
          </Field>
        </Section>

        <Section title="Vigilância">
          <Field label="Vigiar" hint="Parâmetros a acompanhar.">
            <textarea
              value={patient.watchParams}
              onChange={(e) => update({ watchParams: e.target.value })}
              placeholder="Ex.: PA, diurese, glicemia capilar 6/6h"
              className={textareaClass}
            />
          </Field>
          <Field label="Sinais de alerta" hint="Quando chamar o médico.">
            <textarea
              value={patient.alertSigns}
              onChange={(e) => update({ alertSigns: e.target.value })}
              placeholder="Ex.: SatO2 < 90%, PAS < 90, rebaixamento"
              className={textareaClass}
            />
          </Field>
        </Section>

        <div className="py-6">
          <Button onClick={finish} className="w-full">
            <Check className="h-4 w-4" /> Concluir
          </Button>
        </div>
      </div>
    </div>
  )
}
