import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// Gerador da aba "Gerar": aceita texto e/ou imagens e/ou PDF, e devolve o SBAR
// estruturado (S/B/A/R + alert) por paciente. Chave da API só no servidor.
const MODEL = process.env.SBAR_MODEL || 'claude-opus-4-8'

const SYSTEM = `Você é um assistente médico especializado em comunicação clínica estruturada e bem concisa para passagem de plantão hospitalar. Sua tarefa: receber dados brutos de prontuário (texto, imagem ou PDF) e transformar em relatório SBAR claro, objetivo e conciso, pronto para o médico que assume. NUNCA invente dados; em caso de dúvida, sinalize.

REGRAS:
1. Linguagem técnica e direta. Sem rodeios nem repetições.
2. Se alguma informação estiver ausente, sinalize com [informação não disponível]. NUNCA invente dados.
3. Preserve leitos, datas e medicações exatamente como estão. Identifique o paciente por INICIAIS (ex.: "J.S."), NUNCA pelo nome completo — se um nome completo aparecer na fonte, reduza-o a iniciais.
4. Inclua "alert" apenas se houver algo crítico ou urgente — senão deixe "".
5. Seja conciso: situation = 1-2 frases; background = 3-5 frases; assessment = 2-4 frases; recommendation = bullets de pendências.

CAMPOS (por paciente):
- leito: identificação do leito (ex.: "7B15"), ou "" se ausente.
- iniciais: iniciais do paciente (ex.: "J.S."), nunca nome completo.
- situation: motivo principal de internação + status atual, em 1-2 frases.
- background: histórico relevante (comorbidades, medicações, evolução), de forma sucinta.
- assessment: impressão clínica atual — diagnósticos confirmados, hipóteses, estado hemodinâmico, sinais de alerta.
- recommendation: o que o médico que assume precisa fazer — pendências de exames, ajustes, condutas urgentes, observações. Cada item começando com "• ".
- alert: observação crítica/urgente. "" se não houver.

MÚLTIPLOS PACIENTES: se o texto tiver mais de um paciente (ex.: leitos "7B15", "7B16"), gere um objeto por paciente no array "patients".`

const PATIENT_PROPS = {
  leito: { type: 'string' },
  iniciais: { type: 'string' },
  situation: { type: 'string' },
  background: { type: 'string' },
  assessment: { type: 'string' },
  recommendation: { type: 'string' },
  alert: { type: 'string' },
}

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    patients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: PATIENT_PROPS,
        required: Object.keys(PATIENT_PROPS),
      },
    },
  },
  required: ['patients'],
}

const OK_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface ImageInput {
  media_type: string
  data: string
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

  const body = (req.body ?? {}) as {
    text?: unknown
    images?: unknown
    pdf?: unknown
  }
  const text = typeof body.text === 'string' ? body.text : ''
  const images: ImageInput[] = Array.isArray(body.images)
    ? (body.images as ImageInput[]).slice(0, 4)
    : []
  const pdf =
    body.pdf && typeof (body.pdf as { data?: unknown }).data === 'string'
      ? (body.pdf as { data: string })
      : null

  if (!text.trim() && images.length === 0 && !pdf) {
    res.status(400).json({ error: 'Nenhum conteúdo enviado.' })
    return
  }
  if (text.length > 60000) {
    res.status(413).json({ error: 'Texto muito longo. Reduza ou divida em partes.' })
    return
  }
  const base64Bytes =
    images.reduce((n, i) => n + (i?.data?.length ?? 0), 0) + (pdf?.data.length ?? 0)
  if (base64Bytes > 5_500_000) {
    res.status(413).json({ error: 'Arquivos muito grandes. Reduza o tamanho ou a quantidade.' })
    return
  }

  const content: Anthropic.ContentBlockParam[] = []
  for (const img of images) {
    if (img?.data && OK_IMAGE.includes(img?.media_type)) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.media_type as 'image/jpeg',
          data: img.data,
        },
      })
    }
  }
  if (pdf) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf.data },
    })
  }
  content.push({
    type: 'text',
    text: text.trim()
      ? text
      : 'Analise o conteúdo acima e gere o SBAR estruturado. Se houver vários pacientes por leito, gere um objeto por paciente.',
  })

  const client = new Anthropic()
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      system: SYSTEM,
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
