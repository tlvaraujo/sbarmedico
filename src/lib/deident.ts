// Anonimização best-effort NO NAVEGADOR, antes de enviar o texto para a IA.
// Remove identificadores diretos estruturados (CPF, cartão SUS, e-mail, telefone,
// CEP, RG, nº de prontuário). Nomes soltos NÃO são removíveis por regex de forma
// confiável — por isso o app mostra uma prévia para a médica revisar antes de enviar.

interface Rule {
  name: string
  re: RegExp
  repl: (...groups: string[]) => string
}

const RULES: Rule[] = [
  { name: 'CPF', re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, repl: () => '[CPF]' },
  // Cartão Nacional de Saúde (SUS) — 15 dígitos, com ou sem espaços
  { name: 'Cartão SUS', re: /\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, repl: () => '[CNS]' },
  { name: 'E-mail', re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, repl: () => '[EMAIL]' },
  { name: 'Telefone', re: /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, repl: () => '[TEL]' },
  { name: 'CEP', re: /\b\d{5}-?\d{3}\b/g, repl: () => '[CEP]' },
  { name: 'RG', re: /\bRG[:\s]*[\d.\-xX]{5,}/gi, repl: () => 'RG: [RG]' },
  {
    name: 'Nº de prontuário/registro',
    re: /\b(pront(?:u[aá]rio)?|atendimento|registro|matr[ií]cula)\b[:\s#]*\d{3,}/gi,
    repl: (_m, p1) => `${p1}: [Nº]`,
  },
]

export interface DeidentResult {
  text: string
  counts: { name: string; count: number }[]
  total: number
}

export function deidentify(input: string): DeidentResult {
  let text = input
  const counts: { name: string; count: number }[] = []
  let total = 0

  for (const { name, re, repl } of RULES) {
    let n = 0
    text = text.replace(re, (...args) => {
      n++
      // args = [match, ...groups, offset, string]
      const groups = args.slice(1, -2) as string[]
      return repl(args[0] as string, ...groups)
    })
    if (n > 0) {
      counts.push({ name, count: n })
      total += n
    }
  }

  return { text, counts, total }
}
