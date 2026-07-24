// Cliente da aba "Gerar": chama /api/generate (texto/imagem/PDF) e /api/transcribe (áudio).

export interface SbarPatient {
  leito: string
  iniciais: string
  situation: string
  background: string
  assessment: string
  recommendation: string
  alert: string
}

export interface ImageInput {
  media_type: string
  data: string // base64 sem o prefixo data:
}

export interface GeneratePayload {
  text?: string
  images?: ImageInput[]
  pdf?: { data: string }
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Sem conexão com o servidor de IA. Verifique a internet.')
  }
  if (resp.status === 404) {
    throw new Error(
      'O gerador por IA não está disponível neste endereço. Use o app publicado na Vercel.',
    )
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`
    try {
      const b = (await resp.json()) as { error?: string }
      if (b?.error) msg = b.error
    } catch {
      /* mantém msg genérica */
    }
    throw new Error(msg)
  }
  return resp.json()
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function normalize(raw: Record<string, unknown>): SbarPatient {
  return {
    leito: str(raw.leito),
    iniciais: str(raw.iniciais),
    situation: str(raw.situation),
    background: str(raw.background),
    assessment: str(raw.assessment),
    recommendation: str(raw.recommendation),
    alert: str(raw.alert),
  }
}

export async function generate(payload: GeneratePayload): Promise<SbarPatient[]> {
  const data = (await postJson('/api/generate', payload)) as { patients?: unknown }
  const list = Array.isArray(data.patients) ? (data.patients as Record<string, unknown>[]) : []
  return list.map(normalize)
}

export async function transcribe(audio: string, mime: string): Promise<string> {
  const data = (await postJson('/api/transcribe', { audio, mime })) as { text?: unknown }
  return str(data.text)
}

// --- Helpers de arquivo/áudio/imagem ---

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    r.readAsDataURL(blob)
  })
}

function stripDataUrl(dataUrl: string): string {
  const i = dataUrl.indexOf(',')
  return i >= 0 ? dataUrl.slice(i + 1) : ''
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return stripDataUrl(await readAsDataUrl(blob))
}

export async function fileToImageInput(file: File): Promise<ImageInput> {
  return { media_type: file.type || 'image/jpeg', data: await blobToBase64(file) }
}

/** Reduz a imagem (borda longa) e recomprime em JPEG para diminuir payload/tokens. */
export async function downscaleImage(
  file: File,
  maxEdge = 2000,
  quality = 0.85,
): Promise<ImageInput> {
  if (!file.type.startsWith('image/')) return fileToImageInput(file)
  try {
    const bitmap = await createImageBitmap(file)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, maxEdge / longest)
    if (scale >= 1 && file.size < 800_000) {
      bitmap.close?.()
      return fileToImageInput(file)
    }
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close?.()
      return fileToImageInput(file)
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    return { media_type: 'image/jpeg', data: stripDataUrl(canvas.toDataURL('image/jpeg', quality)) }
  } catch {
    return fileToImageInput(file)
  }
}
