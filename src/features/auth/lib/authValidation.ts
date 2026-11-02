const DISPLAY_NAME_MIN_LENGTH = 2
const DISPLAY_NAME_MAX_LENGTH = 80
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeDisplayName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function getEmailError(value: string): string | null {
  const email = normalizeEmail(value)

  if (!email) {
    return 'Informe seu e-mail.'
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return 'Informe um e-mail válido.'
  }

  return null
}

export function getDisplayNameError(value: string): string | null {
  const displayName = normalizeDisplayName(value)

  if (displayName.length < DISPLAY_NAME_MIN_LENGTH) {
    return 'Informe um nome de DJ com pelo menos 2 caracteres.'
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return 'O nome de DJ deve ter no máximo 80 caracteres.'
  }

  return null
}

export function getLoginPasswordError(value: string): string | null {
  if (!value) {
    return 'Informe sua senha.'
  }

  return null
}

export function getSignUpPasswordError(value: string): string | null {
  if (!value) {
    return 'Crie uma senha.'
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return 'A senha deve ter pelo menos 8 caracteres.'
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    return 'A senha deve ter no máximo 72 caracteres.'
  }

  return null
}

export function getPasswordConfirmationError(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) {
    return 'Confirme sua senha.'
  }

  if (password !== confirmation) {
    return 'As senhas não coincidem.'
  }

  return null
}
