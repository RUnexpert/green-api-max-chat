import type { Chat, ChatMessage, Credentials } from '../types/chat'

/**
 * Хранение данных тестового приложения в localStorage текущего браузера.
 * Любая ошибка доступа к хранилищу (приватный режим, квота) не ломает приложение.
 */

const CREDENTIALS_KEY = 'green-api-max-chat:credentials'
const chatsKey = (idInstance: string) => `green-api-max-chat:chats:${idInstance}`

export interface PersistedChats {
  chats: Chat[]
  messages: Record<string, ChatMessage[]>
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // хранилище недоступно — данные останутся только в памяти
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function loadCredentials(): Credentials | null {
  const data = read(CREDENTIALS_KEY) as Partial<Credentials> | null
  if (
    typeof data?.apiUrl === 'string' &&
    typeof data.idInstance === 'string' &&
    typeof data.apiTokenInstance === 'string'
  ) {
    return { apiUrl: data.apiUrl, idInstance: data.idInstance, apiTokenInstance: data.apiTokenInstance }
  }
  return null
}

export function saveCredentials(credentials: Credentials): void {
  write(CREDENTIALS_KEY, credentials)
}

export function loadChats(idInstance: string): PersistedChats | null {
  const data = read(chatsKey(idInstance)) as Partial<PersistedChats> | null
  if (!Array.isArray(data?.chats) || !data.messages || typeof data.messages !== 'object') return null
  return { chats: data.chats, messages: data.messages }
}

export function saveChats(idInstance: string, data: PersistedChats): void {
  write(chatsKey(idInstance), data)
}

/** Выход: удаляет credentials и локальную историю переписки */
export function clearSession(idInstance: string): void {
  remove(CREDENTIALS_KEY)
  remove(chatsKey(idInstance))
}
