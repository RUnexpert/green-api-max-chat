import { useRef } from 'react'
import { checkAccount, sendMessage } from '../api/greenApi'
import { useChatStore } from '../hooks/useChatStore'
import { useMessagesPolling } from '../hooks/useMessagesPolling'
import type { ChatMessage, Credentials } from '../types/chat'
import { createId, toErrorMessage } from '../utils/format'
import { ChatHeader } from './ChatHeader'
import { ChatSidebar } from './ChatSidebar'
import { ChatBubbleIcon } from './icons'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'

interface ChatScreenProps {
  credentials: Credentials
  warning: string | null
  onDismissWarning: () => void
  onLogout: () => void
}

const NO_MESSAGES: ChatMessage[] = []

export function ChatScreen({ credentials, warning, onDismissWarning, onLogout }: ChatScreenProps) {
  const { state, openChat, selectChat, addOutgoing, markSending, markSent, markFailed, addIncoming } =
    useChatStore(credentials.idInstance)

  // Получаем уведомления, только когда есть хотя бы один чат
  const polling = useMessagesPolling({
    credentials,
    enabled: state.chats.length > 0,
    onIncomingText: addIncoming,
  })

  // Сообщения отправляются по очереди, чтобы сохранить их порядок у получателя
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve())

  const activeChat = state.chats.find((chat) => chat.chatId === state.activeChatId) ?? null
  const messages = activeChat ? (state.messages[activeChat.chatId] ?? NO_MESSAGES) : NO_MESSAGES

  const handleCreateChat = async (phone: string) => {
    const existing = state.chats.find((chat) => chat.phone === phone)
    if (existing) {
      selectChat(existing.chatId)
      return
    }

    // Рекомендованный способ: получить chatId по номеру и отправлять по нему.
    // Во входящих уведомлениях MAX собеседник определяется именно по chatId.
    const account = await checkAccount(credentials, Number(phone))
    if (!account.exist || !account.chatId) {
      throw new Error('На этом номере нет аккаунта MAX')
    }
    openChat({ chatId: String(account.chatId), phone, createdAt: Date.now() })
  }

  const deliver = (chatId: string, id: string, text: string) => {
    const job = async () => {
      try {
        const { idMessage } = await sendMessage(credentials, { chatId, message: text })
        markSent(chatId, id, idMessage)
      } catch (error) {
        markFailed(chatId, id, toErrorMessage(error))
      }
    }
    sendQueueRef.current = sendQueueRef.current.then(job)
  }

  const handleSend = (text: string) => {
    if (!activeChat) return
    const id = createId()
    addOutgoing(activeChat.chatId, {
      id,
      direction: 'outgoing',
      text,
      timestamp: Date.now(),
      status: 'sending',
    })
    deliver(activeChat.chatId, id, text)
  }

  const handleRetry = (message: ChatMessage) => {
    if (!activeChat || message.status !== 'failed') return
    markSending(activeChat.chatId, message.id)
    deliver(activeChat.chatId, message.id, message.text)
  }

  const handleLogout = () => {
    if (window.confirm('Выйти? Введённые credentials и локальная история переписки будут удалены.')) {
      onLogout()
    }
  }

  const banners = (
    <>
      {warning && (
        <div className="banner banner--warning" role="status">
          <span>{warning}</span>
          <button className="link-button" type="button" onClick={onDismissWarning}>
            Скрыть
          </button>
        </div>
      )}
      {polling.error && (
        <div className="banner banner--error" role="alert">
          <span>{polling.error}</span>
          {polling.stopped && (
            <button className="link-button" type="button" onClick={onLogout}>
              Выйти
            </button>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className={`layout${activeChat ? ' layout--chat-open' : ''}`}>
      <ChatSidebar
        idInstance={credentials.idInstance}
        chats={state.chats}
        messages={state.messages}
        activeChatId={state.activeChatId}
        onSelectChat={selectChat}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
      />

      <main className="conversation">
        {activeChat ? (
          <>
            <ChatHeader chat={activeChat} onBack={() => selectChat(null)} />
            {banners}
            <MessageList messages={messages} onRetry={handleRetry} />
            <MessageInput key={activeChat.chatId} onSend={handleSend} />
          </>
        ) : (
          <>
            {banners}
            <div className="conversation__placeholder">
              <ChatBubbleIcon />
              <p className="conversation__placeholder-title">Выберите или создайте чат</p>
              <p className="conversation__placeholder-text">
                Введите номер телефона пользователя MAX в панели слева
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
