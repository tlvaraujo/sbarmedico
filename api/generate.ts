import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// Compila UM prontuário (texto/imagem/PDF) em SBAR (S/B/A/R). Chave só no servidor.
const MODEL = process.env.SBAR_MODEL || 'claude-opus-4-8'

const PROP_LABEL: Record<string, string> = {
  suporte_invasivo: 'Suporte invasivo',
  suporte_nao_invasivo: 'Suporte não invasivo individualizado',
  objetivo_nao_definido: 'Objetivo não definido',
}

const SYSTEM = `Você é um assistente médico que compila UM prontuário hospitalar em um relatório SBAR conciso para passagem de plantão, em português do Brasil. Você recebe o registro do paciente (texto, imagens e/ou PDF) e devolve APENAS as quatro seções S, B, A e R.

REGRAS INVIOLÁVEIS:
1. Use SOMENTE informações explícitas no prontuário. NUNCA invente, deduza, estime nem complete dados.
2. Se uma informação não estiver no prontuário, escreva exatamente "não informado no prontuário" (ou deixe a seção vazia se nada se aplicar). Nunca preencha por suposição.
3. Remova todo dado identificável do conteúdo extraído: nome completo (reduza a iniciais), CPF, número de prontuário/registro, endereço, telefone, e-mail, cartão SUS. Refira-se ao paciente apenas por iniciais, se necessário.
4. Um único paciente por geração. Não some nem misture pacientes.
5. Português do Brasil, linguagem clínica objetiva e telegráfica. Sem rodeios, sem repetição, sem recomendações não apoiadas no texto.
6. LIMITES DE TAMANHO (obrigatórios):
   - s (Situação): no máximo 1 linha, uma frase.
   - b (Breve histórico): no máximo 5 linhas.
   - a (Avaliação): no máximo 5 linhas.
   - r (Recomendação): no máximo 5 itens, SEMPRE em tópicos. Cada item é uma ação/pendência curta.

SEÇÕES:
- s: situação atual e o motivo de atenção agora (1 frase).
- b: breve histórico — motivo de internação, comorbidades e evolução relevante.
- a: avaliação/impressão clínica atual apoiada no prontuário.
- r: o que o próximo plantonista precisa fazer — pendências, ajustes, condutas, vigilância.

O contexto fornecido pelo médico (leito, identificação, proporcionalidade terapêutica) serve só para orientar; NÃO o repita nas seções e NÃO o trate como dado do prontuário.`

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    s: { type: 'string' },
    b: { type: 'string' },
    a: { type: 'string' },
    r: { type: 'array', items: { type: 'string' } },
  },
  required: ['s', 'b', 'a', 'r'],
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
  const promptText = `CONTEXTO (fornecido pelo médico — não extrair do prontuário, não repetir nas seções):
- Leito: ${leito || 'não informado'}
- Identificação: ${identificacao || 'não informado'}
- Proporcionalidade terapêutica: ${PROP_LABEL[prop] || PROP_LABEL.objetivo_nao_definido}

PRONTUÁRIO${text.trim() ? ' (texto)' : ''}:
${text.trim() || '(ver imagens/PDF anexados acima)'}`
  content.push({ type: 'text', text: promptText })

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
