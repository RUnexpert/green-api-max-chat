export type PhoneParseResult = { ok: true; phone: string } | { ok: false; error: string }

/**
 * Приводит введённый номер к формату GREEN-API (MAX): только цифры, международный формат,
 * 11 или 12 цифр, коды стран 7 (РФ) и 375 (РБ). Например: 79991234567, 375291234567.
 * https://green-api.com/v3/docs/api/service/CheckAccount/
 * https://green-api.com/v3/docs/api/chat-id/#send-by-phone
 */
export function parsePhone(input: string): PhoneParseResult {
  const value = input.trim()
  if (!value) return { ok: false, error: 'Введите номер телефона' }
  if (/[^\d\s()+-]/.test(value)) {
    return { ok: false, error: 'Номер может содержать только цифры, пробелы, «+», «-» и скобки' }
  }

  let digits = value.replace(/\D/g, '')
  // Российский внутренний формат: 8 999 123-45-67 → 7 999 123-45-67
  if (!value.startsWith('+') && digits.length === 11 && /^8[1-9]/.test(digits)) {
    digits = `7${digits.slice(1)}`
  }

  if (/^7\d{10}$/.test(digits) || /^375\d{9}$/.test(digits)) {
    return { ok: true, phone: digits }
  }
  return {
    ok: false,
    error: 'Укажите номер РФ (+7 XXX XXX-XX-XX) или РБ (+375 XX XXX-XX-XX)',
  }
}

export function formatPhone(phone: string): string {
  if (/^7\d{10}$/.test(phone)) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`
  }
  if (/^375\d{9}$/.test(phone)) {
    return `+375 ${phone.slice(3, 5)} ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10)}`
  }
  return `+${phone}`
}
