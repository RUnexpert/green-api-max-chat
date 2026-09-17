import { Fragment, useEffect, useRef } from 'react'
import type { ChatMessage } from '../types/chat'
import { formatDay, isSameDay } from '../utils/format'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: ChatMessage[]
  onRetry: (message: ChatMessage) => void
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessage = messages.at(-1)
  const lastKey = lastMessage ? `${lastMessage.id}:${lastMessage.status}` : ''

  // Прокрутка к последнему сообщению при появлении нового или смене его статуса
  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [lastKey, messages.length])

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <div className="empty-hint">
          <p className="empty-hint__title">Сообщений пока нет</p>
          <p className="empty-hint__text">
            Напишите первое сообщение — ответы собеседника появятся здесь автоматически.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list" ref={scrollRef} role="log" aria-live="polite">
      <div className="message-list__inner">
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const showDay = !previous || !isSameDay(previous.timestamp, message.timestamp)
          return (
            <Fragment key={message.id}>
              {showDay && (
                <div className="day-divider">
                  <span>{formatDay(message.timestamp)}</span>
                </div>
              )}
              <MessageBubble message={message} onRetry={onRetry} />
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
