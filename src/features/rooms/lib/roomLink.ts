/**
 * Monta o link público de uma sala a partir do código e da origem do site.
 * A origem pode terminar com `/`; o caminho gerado é sempre relativo à raiz.
 */
export function buildRoomLink(code: string, origin: string): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}/sala/${code}`
}
