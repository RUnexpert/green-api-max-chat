import type { ChatMessage } from '../types/chat'
import { formatTime } from '../utils/format'
import { AlertIcon, CheckIcon, ClockIcon } from './icons'

interface MessageBubbleProps {
  message: ChatMessage
  onRetry: (message: ChatMessage) => void
}

const STATUS_LABEL = {
  sending: 'Отправляется',
  sent: 'Отправлено',
  failed: 'Не отправлено',
  received: 'Получено',
} as const

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const outgoing = message.direction === 'outgoing'

  return (
    <div className={`message message--${message.direction} message--${message.status}`}>
      <div className="bubble">
        <p className="bubble__text">{message.text}</p>
        <span className="bubble__meta">
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {outgoing && (
            <span className="bubble__status" title={STATUS_LABEL[message.status]}>
              {message.status === 'sending' && <ClockIcon />}
              {message.status === 'sent' && <CheckIcon />}
              {message.status === 'failed' && <AlertIcon />}
              <span className="visually-hidden">{STATUS_LABEL[message.status]}</span>
            </span>
          )}
        </span>
      </div>

      {message.status === 'failed' && (
        <div className="message__error" role="alert">
          <span>{message.error || 'Не удалось отправить сообщение'}</span>
          <button className="link-button" type="button" onClick={() => onRetry(message)}>
            Повторить
          </button>
        </div>
      )}
    </div>
  )
}
