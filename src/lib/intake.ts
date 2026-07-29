import { deidentify } from './deident'
import { blobToBase64, downscaleImage, type ImageInput } from './generate'

// Transforma os arquivos escolhidos + texto colado num payload para a IA.
// Regras: imagem → downscale; PDF → base64; TXT → texto; DOCX → mammoth → texto;
// .doc legado → pulado. Só o TEXTO passa por anonimização (imagem/PDF não dá).

export interface Intake {
  text: string
  images: ImageInput[]
  pdfs: { data: string }[]
  skipped: string[]
}

function isDocx(f: File): boolean {
  return (
    f.name.toLowerCase().endsWith('.docx') ||
    f.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

async function extractDocx(f: File): Promise<string> {
  const mod = (await import('mammoth')) as unknown as {
    extractRawText?: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
    default?: { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }
  }
  const extract = mod.extractRawText ?? mod.default?.extractRawText
  if (!extract) return ''
  const { value } = await extract({ arrayBuffer: await f.arrayBuffer() })
  return value ?? ''
}

export async function buildIntake(files: File[], pasted: string): Promise<Intake> {
  const images: ImageInput[] = []
  const pdfs: { data: string }[] = []
  const texts: string[] = []
  const skipped: string[] = []

  if (pasted.trim()) texts.push(pasted.trim())

  for (const f of files) {
    const type = f.type
    const name = f.name.toLowerCase()
    try {
      if (type.startsWith('image/')) {
        images.push(await downscaleImage(f))
      } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
        pdfs.push({ data: await blobToBase64(f) })
      } else if (type === 'text/plain' || name.endsWith('.txt')) {
        texts.push(await f.text())
      } else if (isDocx(f)) {
        const t = await extractDocx(f)
        if (t.trim()) texts.push(t)
        else skipped.push(f.name)
      } else {
        // .doc legado e outros formatos não suportados
        skipped.push(f.name)
      }
    } catch {
      skipped.push(f.name)
    }
  }

  const merged = texts.join('\n\n').trim()
  const text = merged ? deidentify(merged).text : ''
  return { text, images, pdfs, skipped }
}
