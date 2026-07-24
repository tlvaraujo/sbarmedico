// Trava por PIN — DISSUASÃO, não criptografia. Os dados no IndexedDB não são
// cifrados; o PIN só evita que alguém abra o app casualmente. Confie também no
// bloqueio de tela do aparelho.

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const SALT = 'sbar-medico::'

export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(SALT + pin)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return (await hashPin(pin)) === hash
}
