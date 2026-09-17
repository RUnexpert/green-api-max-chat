import type { Chat } from '../types/chat'

const PALETTE = ['#ff6b9b', '#9b90fe', '#14c7d5', '#ffb45c', '#56b3ff', '#7ccf6b']

function getInitials(chat: Chat): string {
  if (chat.name) {
    const letters = chat.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('')
    if (letters) return letters
  }
  return chat.phone.slice(-2)
}

function getColor(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

interface AvatarProps {
  chat: Chat
}

export function Avatar({ chat }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{ background: getColor(chat.chatId) }}
      aria-hidden="true"
    >
      {getInitials(chat)}
    </span>
  )
}
