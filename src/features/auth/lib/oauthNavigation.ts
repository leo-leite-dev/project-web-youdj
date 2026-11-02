/**
 * Navegação do navegador para a página de autorização do provedor OAuth.
 * Isolar a chamada permite testar o fluxo sem simular o navegador.
 */
export function redirectToAuthorization(url: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.location.assign(url)
}
