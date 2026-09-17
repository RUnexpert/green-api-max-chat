import type { Chat, ChatMessage } from '../types/chat'
import { formatListTime } from '../utils/format'
import { formatPhone } from '../utils/phone'
import { Avatar } from './Avatar'
import { LogoutIcon } from './icons'
import { NewChatForm } from './NewChatForm'

interface ChatSidebarProps {
  idInstance: string
  chats: Chat[]
  messages: Record<string, ChatMessage[]>
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onCreateChat: (phone: string) => Promise<void>
  onLogout: () => void
}

export function ChatSidebar({
  idInstance,
  chats,
  messages,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onLogout,
}: ChatSidebarProps) {
  const items = chats
    .map((chat) => {
      const lastMessage = messages[chat.chatId]?.at(-1)
      return { chat, lastMessage, activity: lastMessage?.timestamp ?? chat.createdAt }
    })
    .sort((a, b) => b.activity - a.activity)

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true" />
          <div>
            <div className="sidebar__title">Чаты MAX</div>
            <div className="sidebar__subtitle">Инстанс {idInstance}</div>
          </div>
        </div>
        <button
          className="button button--ghost button--icon"
          type="button"
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти и очистить данные"
        >
          <LogoutIcon />
        </button>
      </header>

      <NewChatForm onCreate={onCreateChat} />

      <nav className="chat-list" aria-label="Чаты">
        {items.length === 0 ? (
          <p className="chat-list__empty">
            Чатов пока нет. Введите номер телефона пользователя MAX, чтобы начать переписку.
          </p>
        ) : (
          items.map(({ chat, lastMessage }) => (
            <button
              key={chat.chatId}
              type="button"
              className={`chat-item${chat.chatId === activeChatId ? ' chat-item--active' : ''}`}
              onClick={() => onSelectChat(chat.chatId)}
              aria-current={chat.chatId === activeChatId ? 'true' : undefined}
            >
              <Avatar chat={chat} />
              <span className="chat-item__body">
                <span className="chat-item__top">
                  <span className="chat-item__title">{chat.name || formatPhone(chat.phone)}</span>
                  {lastMessage && (
                    <span className="chat-item__time">{formatListTime(lastMessage.timestamp)}</span>
                  )}
                </span>
                <span className="chat-item__preview">
                  {lastMessage ? (
                    <>
                      {lastMessage.direction === 'outgoing' && (
                        <span className="chat-item__you">Вы: </span>
                      )}
                      {lastMessage.text}
                    </>
                  ) : (
                    'Нет сообщений'
                  )}
                </span>
              </span>
            </button>
          ))
        )}
      </nav>
    </aside>
  )
}
