import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// Compila UM prontuário (texto/imagem/PDF) em SBAR (S/B/A/R). Chave só no servidor.
const MODEL = process.env.SBAR_MODEL || 'claude-opus-4-8'

const PROP_LABEL: Record<string, string> = {
  suporte_invasivo: 'Suporte invasivo',
  suporte_nao_invasivo: 'Suporte não invasivo individualizado',
  objetivo_nao_definido: 'Objetivo não definido',
}

const SYSTEM = `Você redige um SBAR de COBERTURA a partir de prontuário hospitalar, em português do Brasil. O destinatário é um médico que NÃO acompanha o paciente diariamente e o avaliará pontualmente durante a janela de cobertura (tipicamente um fim de semana). Ele não vai conduzir o caso: vai reagir a eventos.

REGRA SUPREMA — NÃO INVENTAR:
Escreva apenas informação explicitamente registrada no prontuário fornecido.
- Não infira diagnóstico, gravidade, prognóstico ou conduta que não estejam escritos.
- Não complete lacuna com o que seria clinicamente plausível ou esperado.
- Não converta "provável X" em "X", nem "considerar Y" em "fazer Y".
- Não crie conduta condicional que ninguém prescreveu. Se o prontuário não registra o que fazer diante de piora, não escreva nada sobre piora.
- Informação ausente: omita o tópico (não escreva que está ausente dentro de S/B/A/R). Item crítico ausente vai só em campos_ausentes.
- Na dúvida entre omitir e incluir, OMITA. Falta de informação é visível para o médico; informação inventada não é.
- Preserve unidades, doses e datas exatamente como registradas.

ESTRUTURA:
Exatamente quatro campos de conteúdo: S, B, A, R. Não crie seções, títulos ou categorias adicionais. Leito, identificação e proporcionalidade terapêutica são campos do app e NÃO entram no corpo do SBAR.

REGRA DE ROTINA: profilaxia de TEV de rotina (enoxaparina profilática, ainda que descrita como "alto risco" ou "Pádua > 4") NÃO entra em NENHUMA seção — nem no B, nem no R. Só apareça se for questão ATIVA da conduta: ex.: profilaxia suspensa/contraindicada por sangramento, ou anticoagulação em dose terapêutica.

S — SITUAÇÃO (uma linha; alvo ~80 caracteres; NUNCA mais de uma linha, qualquer que seja a complexidade):
O problema ATIVO principal que motiva a atenção/manejo agora — tipicamente a SITUAÇÃO 1 do prontuário —, NÃO a doença de base (esta vai no B). Telegráfico, como etiqueta clínica. Sem trajetória, sem história, sem status (isso é do A).
- Se o paciente tem câncer de base mas está sob manejo por uma infecção de ferida operatória, o S é "Infecção de FO de laminectomia" e o câncer vai no B.
- Correto: "PAC grave em DPOC exacerbada" · "Choque séptico de foco urinário"
- Errado: "Paciente idoso internado há 9 dias com pneumonia adquirida na comunidade, atualmente em melhora"

B — BACKGROUND (lista; tópicos densos e telegráficos; rótulos curtos):
Doença de base e motivo da internação + o manejo/terapia em curso relevante (procedimentos, ATB com o dia, dispositivos). Cite os problemas secundários relevantes como RÓTULOS CURTOS, um por tópico (ex.: "Síndrome de Cushing iatrogênica", "Colonização por MRSA", "Dor oncológica em manejo pela Clínica da Dor").
NÃO repita no B esquemas de dose que já vão no R — o esquema completo (ex.: analgesia) fica só no R; no B fica o rótulo ("dor oncológica em manejo").
NÃO coloque STATUS clínico atual no B (déficits, força/nível sensitivo, sinais vitais, exames de hoje) — isso é A.
NÃO inclua: comorbidade que não muda a conduta na janela, cronologia detalhada da internação, exames normais, medicação crônica estável, história social, profilaxia de TEV de rotina (é padrão — só cite se for clinicamente importante para a conduta: ex.: suspensa/contraindicada por sangramento, ou anticoagulação em dose terapêutica).
Entram só se registrados (não geram tópico se ausentes): alergia relevante, precaução de contato/isolamento, acesso venoso difícil, via aérea difícil.

A — AVALIAÇÃO (lista; tópicos curtos — só o clinicamente relevante):
Para cada problema ativo, o status que muda ou orienta a conduta: resposta ao tratamento (ex.: infecção — PCR/afebril/vancocinemia), déficit neurológico/funcional (força/nível sensitivo, nível de consciência), controle da dor. Não repita o B.
CORTE a rotina que não muda conduta — aceitação de dieta, diurese, evacuação, sinais vitais normais, edema trivial — inclua só se ALTERADA ou relevante para a janela.
Inclua "o que se espera" SOMENTE se estiver registrado — não invente expectativa nem prognóstico. NÃO inclua negativas pró-forma ("sem queixas", "sem intercorrências"). Alinhamento de objetivos de cuidado só se houver registro da conversa, com a data.

R — RECOMENDAÇÃO (lista; até ~5 tópicos; é o bloco de ação):
Lista de ações e vigilância para a janela, cada tópico iniciando pela ação:
- Manter/continuar condutas em curso (ex.: "Manter dieta líquida completa", "Manter laxativos").
- Cobrar/solicitar pendências, com o dia se registrado (ex.: "Cobrar dilatação por balão", "Cobrar exames da rotina").
- Vigiar/acompanhar (ex.: "Vigilância infecciosa; curva térmica rigorosa", "Acompanhar controle da dor").
- Condutas condicionais quando registradas, no formato "Se evento: ação".
NÃO liste profilaxia de TEV de rotina (só se importante para a conduta — ex.: suspensa/contraindicada por sangramento).
Reproduza SOMENTE o que está prescrito/registrado. Este é o campo de maior risco de invenção — confira cada tópico contra o texto de origem.

EXPANSÃO ALÉM DO ALVO:
Os alvos são referência, não teto; truncar informação que muda conduta é pior que exceder o alvo. Expanda APENAS se pelo menos um destes estiver documentado: três ou mais problemas ativos simultâneos; pós-operatório recente com complicação; investigação diagnóstica em curso com exames pendentes na janela; imunossupressão ou múltiplos dispositivos invasivos; objetivo de cuidado não definido ou em conflito registrado. Ordem de expansão: primeiro R, depois A, por último B. O S permanece sempre em uma linha. Fora desses critérios, mantenha-se no alvo — não use a permissão de expandir como licença para alongar.

ESTILO:
- Telegráfico. Sem prosa, sem conectivos de ligação, sem frases introdutórias.
- Sem hedge ("aparentemente", "possivelmente") salvo se a incerteza estiver registrada no prontuário.
- Abreviações médicas padrão são bem-vindas (ATB, VNI, IOT, AVP, HV, MMII, HAS, DM, RT, D9).

CAMPOS AUSENTES:
Em campos_ausentes liste itens CRÍTICOS não localizados no prontuário — por exemplo "proporcionalidade terapêutica não registrada" ou "sem plano registrado para deterioração clínica". Lista vazia se não houver. Este é o único lugar onde se aponta ausência.

Se o prontuário for ilegível, incompleto a ponto de impedir a redação, ou não corresponder a paciente internado: preencha o que conseguir e descreva o problema em campos_ausentes; não preencha o resto por dedução.

EXEMPLOS DE REFERÊNCIA (mostram estilo, densidade e estrutura desejados — NÃO copie o conteúdo clínico; cada linha de B/A/R é um item da lista):

Exemplo 1
S: Disfagia
B:
- PO de gastrectomia por adenocarcinoma invasor de JEG; interna por disfagia de condução por estenose de anastomose esôfago-jejunal; proposta de dilatação por balão (pedido administrativo)
A:
- Dieta por SNE sem estase; dieta oral com boa aceitação
R:
- Manter dieta líquida completa
- Dieta enteral a cargo da nutrição
- Cobrar dilatação da estenose por balão
- Manter laxativos

Exemplo 2
S: Crise visceral por metástases hepáticas em progressão
B:
- Ca de mama com metástase hepática e pulmonar
- Interna por dor em HCD com irradiação p/ flanco direito, com elevação recente de enzimas hepáticas/canaliculares; manejo Doxo Lipossomal + Zometa em 30/07
A:
- Mantém dor em HCD, necessidade de morfina de resgate 2x/24h
R:
- Prescrito clister — acompanhar padrão intestinal
- Cobrar exames da rotina
- Vigilância infecciosa; curva térmica rigorosa
- Acompanhar controle da dor

O contexto do app (leito, identificação, proporcionalidade terapêutica) serve só para orientar; NÃO o repita nas seções e NÃO o trate como dado do prontuário.`

type Section = 's' | 'b' | 'a' | 'r'
const SECTIONS: Section[] = ['s', 'b', 'a', 'r']
const SECTION_LABEL: Record<Section, string> = {
  s: 'Situação',
  b: 'Background',
  a: 'Avaliação',
  r: 'Recomendação',
}
const ARR = { type: 'array', items: { type: 'string' } }
const PROP_TYPES: Record<Section, Record<string, unknown>> = {
  s: { type: 'string' },
  b: ARR,
  a: ARR,
  r: ARR,
}

// Schema completo (S/B/A/R + campos_ausentes) ou de uma seção só, quando `only` é passado.
function buildSchema(only?: Section): Record<string, unknown> {
  if (only) {
    return {
      type: 'object',
      additionalProperties: false,
      properties: { [only]: PROP_TYPES[only] },
      required: [only],
    }
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties: { s: PROP_TYPES.s, b: ARR, a: ARR, r: ARR, campos_ausentes: ARR },
    required: ['s', 'b', 'a', 'r', 'campos_ausentes'],
  }
}

const OK_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Chave da API não configurada no servidor.' })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const leito = str(body.leito)
  const identificacao = str(body.identificacao)
  const prop = str(body.proporcionalidade) || 'objetivo_nao_definido'
  const text = str(body.text)
  const images = (Array.isArray(body.images) ? body.images : []).filter(
    (i): i is { media_type: string; data: string } =>
      !!i &&
      typeof (i as { data?: unknown }).data === 'string' &&
      OK_IMAGE.includes((i as { media_type?: string }).media_type ?? ''),
  )
  const pdfs = (Array.isArray(body.pdfs) ? body.pdfs : []).filter(
    (p): p is { data: string } => !!p && typeof (p as { data?: unknown }).data === 'string',
  )
  const only = SECTIONS.find((k) => k === body.only)
  const current = (body.current ?? {}) as Record<string, unknown>

  if (!text.trim() && images.length === 0 && pdfs.length === 0) {
    res.status(400).json({ error: 'Envie o prontuário (texto, foto, imagem ou PDF).' })
    return
  }
  if (text.length > 60000) {
    res.status(413).json({ error: 'Texto muito longo. Reduza ou divida.' })
    return
  }
  const b64len =
    images.reduce((n, i) => n + i.data.length, 0) +
    pdfs.reduce((n, p) => n + p.data.length, 0)
  if (b64len > 4_200_000) {
    res.status(413).json({ error: 'Arquivos muito grandes. Reduza o tamanho ou a quantidade.' })
    return
  }

  const content: Anthropic.ContentBlockParam[] = []
  for (const img of images.slice(0, 12)) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type as 'image/jpeg', data: img.data },
    })
  }
  for (const pdf of pdfs) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf.data },
    })
  }
  const fmtList = (v: unknown) =>
    Array.isArray(v) ? (v as unknown[]).map((x) => `• ${str(x)}`).join(' ') : str(v) || '—'
  const contextoSecoes = only
    ? `

SEÇÕES JÁ PREENCHIDAS (refaça SOMENTE "${only.toUpperCase()}" — ${SECTION_LABEL[only]} — mantendo coerência com as demais, sem repetir):
- S: ${str(current.s) || '—'}
- B: ${fmtList(current.b)}
- A: ${fmtList(current.a)}
- R: ${fmtList(current.r)}`
    : ''

  const promptText = `CONTEXTO (fornecido pelo médico — não extrair do prontuário, não repetir nas seções):
- Leito: ${leito || 'não informado'}
- Identificação: ${identificacao || 'não informado'}
- Proporcionalidade terapêutica: ${PROP_LABEL[prop] || PROP_LABEL.objetivo_nao_definido}
${contextoSecoes}

PRONTUÁRIO${text.trim() ? ' (texto)' : ''}:
${text.trim() || '(ver imagens/PDF anexados acima)'}`
  content.push({ type: 'text', text: promptText })

  const system = only
    ? `${SYSTEM}

NESTA REQUISIÇÃO: refaça SOMENTE a seção "${only.toUpperCase()}" (${SECTION_LABEL[only]}) e devolva apenas essa seção no JSON. Respeite o mesmo limite de tamanho da seção.`
    : SYSTEM

  const client = new Anthropic()
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: buildSchema(only) },
      },
      system,
      messages: [{ role: 'user', content }],
    })

    if (msg.stop_reason === 'refusal') {
      res.status(422).json({ error: 'A IA recusou processar este conteúdo.' })
      return
    }
    const block = msg.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') {
      res.status(502).json({ error: 'A IA não retornou conteúdo utilizável.' })
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(block.text)
    } catch {
      res.status(502).json({ error: 'Resposta da IA em formato inesperado.' })
      return
    }
    res.status(200).json(parsed)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: 'Chave da API inválida (configuração do servidor).' })
      return
    }
    if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'Limite de uso atingido. Tente novamente em instantes.' })
      return
    }
    const message = err instanceof Error ? err.message : 'Falha ao gerar o SBAR.'
    res.status(500).json({ error: message })
  }
}
