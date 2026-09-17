/** Параметры доступа к инстансу GREEN-API */
export interface Credentials {
  /** Хост API, например https://3100.api.green-api.com */
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

/** Локальный чат с пользователем MAX */
export interface Chat {
  /** Идентификатор чата MAX, полученный методом CheckAccount */
  chatId: string
  /** Номер телефона: только цифры, международный формат (79991234567) */
  phone: string
  /** Имя собеседника — известно после первого входящего сообщения */
  name?: string
  createdAt: number
}

export type MessageStatus = 'sending' | 'sent' | 'failed' | 'received'

export interface ChatMessage {
  /** Локальный id для исходящих, idMessage GREEN-API для входящих */
  id: string
  idMessage?: string
  direction: 'incoming' | 'outgoing'
  text: string
  /** Время в миллисекундах */
  timestamp: number
  status: MessageStatus
  error?: string
}

/** Текстовое сообщение, извлечённое из уведомления incomingMessageReceived */
export interface IncomingText {
  idMessage: string
  chatId: string
  senderPhoneNumber: number
  senderName: string
  text: string
  /** Время в миллисекундах */
  timestamp: number
}
