import type { VercelRequest, VercelResponse } from '@vercel/node'
import Groq, { toFile } from 'groq-sdk'

// Transcrição de áudio (fala → texto) via Groq Whisper. Chave só no servidor.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }
  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: 'Chave de transcrição (GROQ_API_KEY) não configurada no servidor.' })
    return
  }

  const body = (req.body ?? {}) as { audio?: unknown; mime?: unknown }
  const audio = typeof body.audio === 'string' ? body.audio : ''
  const mime = typeof body.mime === 'string' && body.mime ? body.mime : 'audio/webm'
  if (!audio) {
    res.status(400).json({ error: 'Áudio vazio.' })
    return
  }

  const buf = Buffer.from(audio, 'base64')
  if (buf.length > 4_000_000) {
    res.status(413).json({ error: 'Áudio muito longo. Grave um trecho menor.' })
    return
  }
  const ext = mime.includes('mp4') || mime.includes('m4a')
    ? 'm4a'
    : mime.includes('mpeg') || mime.includes('mp3')
      ? 'mp3'
      : mime.includes('ogg')
        ? 'ogg'
        : mime.includes('wav')
          ? 'wav'
          : 'webm'

  const client = new Groq()
  try {
    const tr = await client.audio.transcriptions.create({
      file: await toFile(buf, `audio.${ext}`, { type: mime }),
      model: 'whisper-large-v3',
      language: 'pt',
    })
    res.status(200).json({ text: (tr as { text?: string }).text ?? '' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao transcrever o áudio.'
    res.status(500).json({ error: message })
  }
}
