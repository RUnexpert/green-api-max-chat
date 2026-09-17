import type { Chat } from '../types/chat'
import { formatPhone } from '../utils/phone'
import { Avatar } from './Avatar'
import { BackIcon } from './icons'

interface ChatHeaderProps {
  chat: Chat
  onBack: () => void
}

export function ChatHeader({ chat, onBack }: ChatHeaderProps) {
  const phone = formatPhone(chat.phone)

  return (
    <header className="chat-header">
      <button
        className="button button--ghost button--icon chat-header__back"
        type="button"
        onClick={onBack}
        aria-label="К списку чатов"
      >
        <BackIcon />
      </button>
      <Avatar chat={chat} />
      <div className="chat-header__info">
        <h2 className="chat-header__title">{chat.name || phone}</h2>
        <p className="chat-header__subtitle">{chat.name ? phone : 'Пользователь MAX'}</p>
      </div>
    </header>
  )
}
