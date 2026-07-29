// Cliente da IA: chama /api/generate (texto/imagem/PDF → S/B/A/R).
import type { Proporcionalidade } from '../types/document'

export interface ImageInput {
  media_type: string
  data: string // base64 sem o prefixo data:
}

export interface GeneratePayload {
  leito?: string
  identificacao?: string
  proporcionalidade?: Proporcionalidade
  text?: string
  images?: ImageInput[]
  pdfs?: { data: string }[]
}

export interface SbarResult {
  s: string
  b: string
  a: string
  r: string[]
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

/** Aceita array (schema) ou string com quebras (defensivo); tira "• " e vazios. */
function toBullets(v: unknown): string[] {
  const arr = Array.isArray(v)
    ? v
    : typeof v === 'string'
      ? v.split('\n')
      : []
  return arr
    .map((x) => (typeof x === 'string' ? x.replace(/^[•\-*]\s*/, '').trim() : ''))
    .filter(Boolean)
}

export async function generate(payload: GeneratePayload): Promise<SbarResult> {
  const data = (await postJson('/api/generate', payload)) as Record<string, unknown>
  return {
    s: str(data.s),
    b: str(data.b),
    a: str(data.a),
    r: toBullets(data.r),
  }
}

// --- Helpers de arquivo/imagem ---

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
  maxEdge = 1600,
  quality = 0.7,
): Promise<ImageInput> {
  if (!file.type.startsWith('image/')) return fileToImageInput(file)
  try {
    const bitmap = await createImageBitmap(file)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, maxEdge / longest)
    if (scale >= 1 && file.size < 600_000) {
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
