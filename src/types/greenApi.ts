/**
 * Типы запросов и ответов GREEN-API для мессенджера MAX (v3).
 * Описаны только поля, которые использует приложение.
 * https://green-api.com/v3/docs/api/
 */

/** https://green-api.com/v3/docs/api/account/GetStateInstance/ */
export type StateInstance =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export interface GetStateInstanceResponse {
  stateInstance: StateInstance
}

/** https://green-api.com/v3/docs/api/account/GetSettings/ */
export interface GetSettingsResponse {
  wid: string
  typeInstance: string
  webhookUrl: string
  incomingWebhook: 'yes' | 'no'
}

/** https://green-api.com/v3/docs/api/service/CheckAccount/ */
export interface CheckAccountRequest {
  /** 11 или 12 цифр в международном формате (коды стран 7 и 375) */
  phoneNumber: number
}

export interface CheckAccountResponse {
  exist: boolean
  chatId: string
  fromCache?: boolean
}

/** Ответ-отказ, например `{ "status": false, "reason": "instance is starting or not authorized" }` */
export interface FailedStatusResponse {
  status: false
  reason: string
}

/** https://green-api.com/v3/docs/api/sending/SendMessage/ */
export interface SendMessageRequest {
  chatId: string
  /** До 4000 символов */
  message: string
}

export interface SendMessageResponse {
  idMessage: string
}

/** https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/ */
export interface ReceiveNotificationResponse {
  receiptId: number
  body: GreenApiNotification
}

/** https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/ */
export interface DeleteNotificationResponse {
  result: boolean
  reason?: string
}

/* ---------- Формат входящих уведомлений ---------- */

/** https://green-api.com/v3/docs/api/receiving/notifications-format/type-webhook/ */
export type TypeWebhook =
  | 'incomingMessageReceived'
  | 'outgoingMessageReceived'
  | 'outgoingAPIMessageReceived'
  | 'outgoingMessageStatus'
  | 'stateInstanceChanged'
  | 'quotaExceeded'

export interface InstanceData {
  idInstance: number
  wid: string
  /** Для MAX — "v3" */
  typeInstance: string
}

export type ChatType = 'user' | 'group' | 'channel' | 'bot'

export interface SenderData {
  chatId: string
  chatName: string
  chatType: ChatType
  sender: string
  senderName: string
  senderType: ChatType
  senderContactName: string
  /** 0, если номер скрыт или отправитель — группа */
  senderPhoneNumber: number
}

/** https://green-api.com/v3/docs/api/receiving/notifications-format/incoming-message/TextMessage/ */
export interface TextMessageData {
  typeMessage: 'textMessage'
  textMessageData: {
    textMessage: string
    isForwarded?: boolean
    forwardingScore?: number
  }
}

/** https://green-api.com/v3/docs/api/receiving/notifications-format/incoming-message/ExtendedTextMessage/ */
export interface ExtendedTextMessageData {
  typeMessage: 'extendedTextMessage'
  extendedTextMessageData: {
    text: string
    description?: string
    title?: string
    isForwarded?: boolean
    forwardingScore?: number
  }
}

/** https://green-api.com/v3/docs/api/receiving/notifications-format/incoming-message/QuotedMessage/ */
export interface QuotedMessageData {
  typeMessage: 'quotedMessage'
  extendedTextMessageData: {
    text: string
    stanzaId: string
    participant: string
  }
}

export type TextualMessageData = TextMessageData | ExtendedTextMessageData | QuotedMessageData

/** Изображения, файлы, реакции и другие типы приложение не обрабатывает */
export interface OtherMessageData {
  typeMessage: string
}

/** https://green-api.com/v3/docs/api/receiving/notifications-format/incoming-message/Webhook-IncomingMessageReceived/ */
export interface IncomingMessageReceivedWebhook {
  typeWebhook: 'incomingMessageReceived'
  instanceData: InstanceData
  /** UNIX-время в секундах */
  timestamp: number
  idMessage: string
  senderData: SenderData
  messageData: TextualMessageData | OtherMessageData
}

/** Статусы, исходящие, сервисные уведомления — приложению нужен только тип */
export interface OtherWebhook {
  typeWebhook: Exclude<TypeWebhook, 'incomingMessageReceived'>
  timestamp?: number
}

export type GreenApiNotification = IncomingMessageReceivedWebhook | OtherWebhook
