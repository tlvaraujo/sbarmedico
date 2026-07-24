import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// Proxy serverless: guarda a ANTHROPIC_API_KEY no servidor (nunca no navegador),
// recebe o texto (já anonimizado no cliente) e devolve o SBAR estruturado por leito.
const MODEL = process.env.SBAR_MODEL || 'claude-opus-4-8'

const SYSTEM = `Você é um assistente que resume prontuários médicos brasileiros na metodologia SBAR, para uma passagem de plantão segura entre médicos de enfermaria.

Regras invioláveis:
- Use SOMENTE informações presentes no texto. NÃO invente, deduza nem complete dados. Se algo essencial não estiver no texto, deixe o campo vazio e registre em "missing".
- Português do Brasil, linguagem clínica objetiva e telegráfica (estilo passagem de plantão).
- Um objeto por paciente. Se o texto contiver vários pacientes (por leito), separe em vários objetos.
- Identifique o paciente por INICIAIS e LEITO. NUNCA inclua nome completo, CPF, número de prontuário ou outros identificadores diretos na saída — se aparecerem no texto, reduza a iniciais.
- Você produz um RASCUNHO para revisão do médico. Não toma decisões clínicas nem faz recomendações sem apoio no texto.

Para cada paciente:
- bed: leito. initials: iniciais. age: idade só com dígitos (ou ""). sex: "F", "M", "outro" ou "".
- mainDiagnosis: diagnóstico/hipótese principal. comorbidities: lista. allergies: alergias, ou "Nega" se o texto negar, ou "" se não houver informação.
- devices: dispositivos (acessos, sondas, drenos, O2...). pending: pendências em aberto (exames, pareceres, condutas).
- watchParams: parâmetros a vigiar. alertSigns: sinais de alerta / quando chamar.
- stability: "estavel", "atencao" ou "instavel" conforme o texto ("estavel" se não der para inferir).
- SBAR: situacao (S — quadro atual e motivo de atenção agora), historico (B — breve história/motivo de internação e evolução), avaliacao (A — impressão clínica atual), recomendacao (R — condutas, plano e o que fazer no próximo plantão).
- missing: itens críticos ausentes ou ambíguos que o médico DEVE confirmar (ex.: "alergias não informadas", "sem exames recentes"). Lista vazia se nada crítico faltar.`

const PATIENT_PROPS = {
  bed: { type: 'string' },
  initials: { type: 'string' },
  age: { type: 'string' },
  sex: { type: 'string', enum: ['', 'F', 'M', 'outro'] },
  mainDiagnosis: { type: 'string' },
  comorbidities: { type: 'array', items: { type: 'string' } },
  allergies: { type: 'string' },
  devices: { type: 'array', items: { type: 'string' } },
  pending: { type: 'array', items: { type: 'string' } },
  watchParams: { type: 'string' },
  alertSigns: { type: 'string' },
  stability: { type: 'string', enum: ['estavel', 'atencao', 'instavel'] },
  situacao: { type: 'string' },
  historico: { type: 'string' },
  avaliacao: { type: 'string' },
  recomendacao: { type: 'string' },
  missing: { type: 'array', items: { type: 'string' } },
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Chave da API não configurada no servidor.' })
    return
  }

  const text = typeof req.body?.text === 'string' ? (req.body.text as string) : ''
  if (!text.trim()) {
    res.status(400).json({ error: 'Texto do prontuário vazio.' })
    return
  }
  if (text.length > 60000) {
    res.status(413).json({ error: 'Texto muito longo. Reduza ou divida em partes.' })
    return
  }

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
      messages: [{ role: 'user', content: text }],
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
