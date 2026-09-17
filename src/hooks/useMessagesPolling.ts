import { useEffect, useRef, useState } from 'react'
import { deleteNotification, GreenApiError, receiveNotification } from '../api/greenApi'
import type { Credentials, IncomingText } from '../types/chat'
import { toErrorMessage } from '../utils/format'
import { parseIncomingText } from '../utils/notifications'

/** Сколько секунд GREEN-API держит запрос receiveNotification, ожидая уведомление (5–60) */
const RECEIVE_TIMEOUT_SECONDS = 20
/** Минимальная пауза, если пустой ответ пришёл раньше таймаута */
const EMPTY_RESPONSE_PAUSE_MS = 1_000
/** Паузы между повторами после ошибок */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000]

export interface PollingState {
  /** Текст последней ошибки получения; `null`, если всё в порядке */
  error: string | null
  /** Получение остановлено из-за неверных credentials */
  stopped: boolean
}

interface Options {
  credentials: Credentials
  enabled: boolean
  onIncomingText: (message: IncomingText) => void
}

/** Пауза, которая завершается досрочно при отмене */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    let timer = 0
    const done = () => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    timer = window.setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}

function withPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

/**
 * Получение входящих уведомлений через HTTP API GREEN-API.
 *
 * Цикл строго последовательный:
 * 1. receiveNotification — ждём следующее уведомление из очереди (FIFO);
 * 2. если это входящее текстовое сообщение — передаём его в onIncomingText;
 * 3. deleteNotification(receiptId) — подтверждаем обработку ЛЮБОГО полученного уведомления,
 *    иначе очередь не продвинется и то же уведомление будет приходить снова;
 * 4. повторяем.
 *
 * Цикл прерывается через AbortController при размонтировании, выходе или смене credentials.
 */
export function useMessagesPolling({ credentials, enabled, onIncomingText }: Options): PollingState {
  const [state, setState] = useState<PollingState>({ error: null, stopped: false })
  const onIncomingTextRef = useRef(onIncomingText)

  useEffect(() => {
    onIncomingTextRef.current = onIncomingText
  }, [onIncomingText])

  const { apiUrl, idInstance, apiTokenInstance } = credentials

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    const { signal } = controller
    const auth: Credentials = { apiUrl, idInstance, apiTokenInstance }

    const run = async () => {
      let failures = 0

      while (!signal.aborted) {
        const startedAt = Date.now()
        try {
          const notification = await receiveNotification(auth, RECEIVE_TIMEOUT_SECONDS, signal)

          if (notification) {
            const incoming = parseIncomingText(notification.body)
            if (incoming) onIncomingTextRef.current(incoming)

            if (typeof notification.receiptId === 'number') {
              await deleteNotification(auth, notification.receiptId, signal)
            }
          } else if (Date.now() - startedAt < EMPTY_RESPONSE_PAUSE_MS) {
            await sleep(EMPTY_RESPONSE_PAUSE_MS, signal)
          }

          if (failures > 0) {
            failures = 0
            setState({ error: null, stopped: false })
          }
        } catch (error) {
          if (signal.aborted) return

          if (error instanceof GreenApiError && error.kind === 'auth') {
            setState({
              error: `${withPeriod(error.message)} Получение сообщений остановлено.`,
              stopped: true,
            })
            return
          }

          const delay = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)]
          failures += 1
          setState({
            error: `${withPeriod(toErrorMessage(error))} Повтор через ${delay / 1000} с.`,
            stopped: false,
          })
          await sleep(delay, signal)
        }
      }
    }

    void run()

    return () => controller.abort()
  }, [enabled, apiUrl, idInstance, apiTokenInstance])

  return state
}
