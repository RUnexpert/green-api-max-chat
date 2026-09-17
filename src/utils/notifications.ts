import type { IncomingText } from '../types/chat'
import type {
  GreenApiNotification,
  IncomingMessageReceivedWebhook,
  OtherMessageData,
  TextualMessageData,
} from '../types/greenApi'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIncomingMessage(body: GreenApiNotification): body is IncomingMessageReceivedWebhook {
  return body.typeWebhook === 'incomingMessageReceived'
}

/**
 * Текст входящего сообщения. Текстовыми считаются типы:
 * textMessage, extendedTextMessage (текст со ссылкой) и quotedMessage (текстовый ответ с цитатой).
 * Файлы, изображения, реакции и прочее — `null`.
 */
function getText(messageData: TextualMessageData | OtherMessageData): string | null {
  const data = messageData as TextualMessageData
  switch (data.typeMessage) {
    case 'textMessage': {
      const text: unknown = data.textMessageData?.textMessage
      return typeof text === 'string' ? text : null
    }
    case 'extendedTextMessage':
    case 'quotedMessage': {
      const text: unknown = data.extendedTextMessageData?.text
      return typeof text === 'string' ? text : null
    }
    default:
      return null
  }
}

/**
 * Возвращает входящее текстовое сообщение из личного чата или `null`
 * для всех остальных уведомлений (статусы, исходящие, сервисные, файлы, группы).
 */
export function parseIncomingText(body: unknown): IncomingText | null {
  if (!isRecord(body) || typeof body.typeWebhook !== 'string') return null

  const notification = body as unknown as GreenApiNotification
  if (!isIncomingMessage(notification)) return null

  const { idMessage, senderData, messageData, timestamp } = notification
  if (typeof idMessage !== 'string' || !idMessage) return null
  if (!isRecord(senderData) || !isRecord(messageData)) return null
  // Только личные чаты: группы, каналы и боты не показываем
  if (senderData.chatType && senderData.chatType !== 'user') return null
  const chatId = String(senderData.chatId ?? '')
  if (!chatId || chatId.startsWith('-')) return null

  const text = getText(messageData)
  if (text === null || !text.trim()) return null

  return {
    idMessage,
    chatId,
    senderPhoneNumber: Number(senderData.senderPhoneNumber) || 0,
    senderName: senderData.senderContactName || senderData.senderName || senderData.chatName || '',
    text,
    timestamp: typeof timestamp === 'number' ? timestamp * 1000 : Date.now(),
  }
}
