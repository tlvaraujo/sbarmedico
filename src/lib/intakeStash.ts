import type { ImageInput } from './generate'

// Guarda o prontuário (texto/imagens/PDF) só em memória, entre a Entrada e a Revisão,
// para permitir "regerar seção". NÃO é persistido — some ao recarregar/fechar (privacidade).

export interface StashedIntake {
  text: string
  images: ImageInput[]
  pdfs: { data: string }[]
}

let stash: StashedIntake | null = null

export function setStashedIntake(v: StashedIntake | null): void {
  stash = v
}

export function getStashedIntake(): StashedIntake | null {
  return stash
}
