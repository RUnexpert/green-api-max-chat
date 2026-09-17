import type { Credentials } from '../types/chat'
import type {
  CheckAccountRequest,
  CheckAccountResponse,
  DeleteNotificationResponse,
  FailedStatusResponse,
  GetSettingsResponse,
  GetStateInstanceResponse,
  ReceiveNotificationResponse,
  SendMessageRequest,
  SendMessageResponse,
  StateInstance,
} from '../types/greenApi'

/**
 * Клиент HTTP API GREEN-API для мессенджера MAX.
 *
 * Адрес метода: {{apiUrl}}/waInstance{{idInstance}}/{{method}}/{{apiTokenInstance}}
 * https://green-api.com/v3/docs/request-format/
 */

const REQUEST_TIMEOUT_MS = 15_000

export type GreenApiErrorKind = 'auth' | 'http' | 'network' | 'timeout' | 'response'

export class GreenApiError extends Error {
  readonly kind: GreenApiErrorKind
  readonly status: number | null

  constructor(message: string, kind: GreenApiErrorKind, status: number | null = null) {
    super(message)
    this.name = 'GreenApiError'
    this.kind = kind
    this.status = status
  }
}

/**
 * apiUrl публикуется в личном кабинете. Хост инстанса MAX имеет вид
 * https://{первые 4 цифры idInstance}.api.green-api.com, например https://3100.api.green-api.com.
 */
export function getDefaultApiUrl(idInstance: string): string {
  const pool = idInstance.trim().slice(0, 4)
  return /^\d{4}$/.test(pool) ? `https://${pool}.api.green-api.com` : 'https://api.green-api.com'
}

function buildUrl(credentials: Credentials, method: string, suffix = ''): string {
  const host = credentials.apiUrl.trim().replace(/\/+$/, '')
  const id = encodeURIComponent(credentials.idInstance)
  const token = encodeURIComponent(credentials.apiTokenInstance)
  return `${host}/waInstance${id}/${method}/${token}${suffix}`
}

/** Переводит известные ответы GREEN-API в понятные пользователю сообщения */
function translateReason(reason: string): string | null {
  if (/webhook url is set/i.test(reason)) {
    return 'В настройках инстанса указан webhookUrl — получать сообщения через HTTP API нельзя. Очистите поле в личном кабинете GREEN-API и подождите около минуты.'
  }
  if (/starting or not authorized/i.test(reason)) {
    return 'Инстанс не авторизован в MAX. Отсканируйте QR-код в личном кабинете GREEN-API.'
  }
  if (/starting process/i.test(reason)) {
    return 'Инстанс запускается. Повторите попытку через несколько секунд.'
  }
  if (/expired/i.test(reason)) {
    return 'Срок действия инстанса истёк. Продлите его в личном кабинете GREEN-API.'
  }
  if (/suspended/i.test(reason)) {
    return 'На аккаунте MAX временные ограничения: отправка возможна только на номера, сохранившие ваш номер в контактах.'
  }
  if (/contact info limit/i.test(reason)) {
    return 'MAX временно ограничил проверку номеров из-за частых запросов. Повторите попытку позже.'
  }
  if (/instance is deleted/i.test(reason)) {
    return 'Инстанс удалён.'
  }
  return null
}

function extractDetail(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  try {
    const data: unknown = JSON.parse(trimmed)
    if (data && typeof data === 'object') {
      for (const key of ['message', 'reason', 'error', 'description']) {
        const value = (data as Record<string, unknown>)[key]
        if (typeof value === 'string' && value) return value
      }
    }
  } catch {
    // тело ответа не JSON — используем как есть
  }
  return trimmed.slice(0, 300)
}

function httpError(status: number, body: string): GreenApiError {
  const detail = extractDetail(body)
  const known = translateReason(detail)

  // 403 используется и для блокировки отправки (Your account is suspended)
  if (known) return new GreenApiError(known, 'http', status)
  if (status === 401 || status === 403) {
    return new GreenApiError('Неверный idInstance или apiTokenInstance.', 'auth', status)
  }
  if (status === 404) {
    return new GreenApiError('Метод не найден. Проверьте apiUrl инстанса.', 'http', status)
  }
  if (status === 429) {
    return new GreenApiError('Слишком много запросов к GREEN-API. Повторите позже.', 'http', status)
  }
  if (status >= 500) {
    const suffix = detail ? `: ${detail}` : ''
    return new GreenApiError(`Сервер GREEN-API временно недоступен (${status})${suffix}`, 'http', status)
  }
  const suffix = detail ? `: ${detail}` : ''
  return new GreenApiError(`Ошибка GREEN-API (${status})${suffix}`, 'http', status)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Выполняет запрос и возвращает разобранный JSON.
 * Пустой ответ (`null` или пустое тело) возвращается как `null`.
 * Отмена через внешний `signal` пробрасывает исходную AbortError.
 */
async function request<T>(
  url: string,
  { method = 'GET', body, signal, timeoutMs = REQUEST_TIMEOUT_MS }: RequestOptions = {},
): Promise<T | null> {
  signal?.throwIfAborted()

  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = window.setTimeout(abort, timeoutMs)
  signal?.addEventListener('abort', abort, { once: true })

  let status: number
  let ok: boolean
  let text: string
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    status = response.status
    ok = response.ok
    text = await response.text()
  } catch (error) {
    if (signal?.aborted) throw error
    if (controller.signal.aborted) {
      throw new GreenApiError('GREEN-API не ответил вовремя. Повторите попытку.', 'timeout')
    }
    throw new GreenApiError(
      'Не удалось связаться с GREEN-API. Проверьте интернет-соединение и apiUrl.',
      'network',
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }

  if (!ok) throw httpError(status, text)

  const trimmed = text.trim()
  if (!trimmed || trimmed === 'null') return null
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new GreenApiError('GREEN-API вернул некорректный ответ.', 'response', status)
  }
}

function emptyResponse(method: string): GreenApiError {
  return new GreenApiError(`GREEN-API вернул пустой ответ на ${method}.`, 'response')
}

/* ---------- Методы API ---------- */

/** GET getStateInstance — https://green-api.com/v3/docs/api/account/GetStateInstance/ */
export async function getStateInstance(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<GetStateInstanceResponse> {
  const data = await request<GetStateInstanceResponse>(buildUrl(credentials, 'getStateInstance'), {
    signal,
  })
  if (!data?.stateInstance) throw emptyResponse('getStateInstance')
  return data
}

/** GET getSettings — https://green-api.com/v3/docs/api/account/GetSettings/ */
export async function getSettings(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<GetSettingsResponse> {
  const data = await request<GetSettingsResponse>(buildUrl(credentials, 'getSettings'), { signal })
  if (!data) throw emptyResponse('getSettings')
  return data
}

/** POST checkAccount — https://green-api.com/v3/docs/api/service/CheckAccount/ */
export async function checkAccount(
  credentials: Credentials,
  phoneNumber: number,
  signal?: AbortSignal,
): Promise<CheckAccountResponse> {
  const body: CheckAccountRequest = { phoneNumber }
  const data = await request<CheckAccountResponse | FailedStatusResponse>(
    buildUrl(credentials, 'checkAccount'),
    { method: 'POST', body, signal },
  )
  if (!data) throw emptyResponse('checkAccount')
  if ('status' in data && data.status === false) {
    const message = translateReason(data.reason) ?? `GREEN-API: ${data.reason}`
    throw new GreenApiError(message, 'http')
  }
  return data as CheckAccountResponse
}

/** POST sendMessage — https://green-api.com/v3/docs/api/sending/SendMessage/ */
export async function sendMessage(
  credentials: Credentials,
  body: SendMessageRequest,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  const data = await request<SendMessageResponse>(buildUrl(credentials, 'sendMessage'), {
    method: 'POST',
    body,
    signal,
  })
  if (!data?.idMessage) throw emptyResponse('sendMessage')
  return data
}

/**
 * GET receiveNotification — https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/
 * Ждёт уведомление до `receiveTimeout` секунд (5–60). Возвращает `null`, если очередь пуста.
 */
export async function receiveNotification(
  credentials: Credentials,
  receiveTimeout: number,
  signal?: AbortSignal,
): Promise<ReceiveNotificationResponse | null> {
  return request<ReceiveNotificationResponse>(
    buildUrl(credentials, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`),
    { signal, timeoutMs: (receiveTimeout + 15) * 1000 },
  )
}

/** DELETE deleteNotification — https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/ */
export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
): Promise<DeleteNotificationResponse> {
  const data = await request<DeleteNotificationResponse>(
    buildUrl(credentials, 'deleteNotification', `/${receiptId}`),
    { method: 'DELETE', signal },
  )
  return data ?? { result: false }
}

/* ---------- Проверка инстанса при входе ---------- */

const STATE_ERRORS: Partial<Record<StateInstance, string>> = {
  notAuthorized:
    'Инстанс не авторизован в MAX. Отсканируйте QR-код в личном кабинете GREEN-API и повторите вход.',
  blocked: 'Аккаунт MAX, подключённый к инстансу, заблокирован.',
  starting: 'Инстанс запускается. Повторите вход через пару минут.',
  pendingPassword:
    'Инстанс ожидает пароль двухфакторной аутентификации. Завершите авторизацию в личном кабинете GREEN-API.',
}

/**
 * Проверяет credentials и состояние инстанса.
 * Бросает GreenApiError, если работать с инстансом нельзя;
 * возвращает предупреждение, если настройки не позволят получать входящие сообщения.
 */
export async function verifyInstance(credentials: Credentials): Promise<{ warning: string | null }> {
  const { stateInstance } = await getStateInstance(credentials)
  const stateError = STATE_ERRORS[stateInstance]
  if (stateError) throw new GreenApiError(stateError, 'http')

  try {
    const settings = await getSettings(credentials)
    if (settings.webhookUrl) {
      return {
        warning:
          'В настройках инстанса указан webhookUrl — входящие сообщения через HTTP API не придут. Очистите поле в личном кабинете GREEN-API.',
      }
    }
    if (settings.incomingWebhook !== 'yes') {
      return {
        warning:
          'В настройках инстанса выключено «Получать уведомления о входящих сообщениях и файлах» — ответы собеседника не появятся в чате.',
      }
    }
  } catch {
    // Проверка настроек вспомогательная: при ошибке просто не показываем предупреждение
  }
  return { warning: null }
}
