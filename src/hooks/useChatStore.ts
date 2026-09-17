import { useCallback, useEffect, useReducer } from 'react'
import type { Chat, ChatMessage, IncomingText } from '../types/chat'
import { loadChats, saveChats } from '../utils/storage'

export interface ChatState {
  chats: Chat[]
  /** Сообщения по chatId в порядке появления */
  messages: Record<string, ChatMessage[]>
  activeChatId: string | null
}

type Action =
  | { type: 'chat/open'; chat: Chat }
  | { type: 'chat/select'; chatId: string | null }
  | { type: 'message/add-outgoing'; chatId: string; message: ChatMessage }
  | { type: 'message/sending'; chatId: string; id: string }
  | { type: 'message/sent'; chatId: string; id: string; idMessage: string }
  | { type: 'message/failed'; chatId: string; id: string; error: string }
  | { type: 'message/incoming'; incoming: IncomingText }

function updateMessage(
  state: ChatState,
  chatId: string,
  id: string,
  patch: Partial<ChatMessage>,
): ChatState {
  const list = state.messages[chatId]
  if (!list) return state
  return {
    ...state,
    messages: {
      ...state.messages,
      [chatId]: list.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    },
  }
}

function findChatForIncoming(chats: Chat[], incoming: IncomingText): Chat | undefined {
  return (
    chats.find((chat) => chat.chatId === incoming.chatId) ??
    // Запасной вариант сопоставления — по номеру телефона отправителя
    (incoming.senderPhoneNumber > 0
      ? chats.find((chat) => chat.phone === String(incoming.senderPhoneNumber))
      : undefined)
  )
}

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'chat/open': {
      const exists = state.chats.some((chat) => chat.chatId === action.chat.chatId)
      return {
        ...state,
        chats: exists ? state.chats : [...state.chats, action.chat],
        messages: exists ? state.messages : { ...state.messages, [action.chat.chatId]: [] },
        activeChatId: action.chat.chatId,
      }
    }

    case 'chat/select':
      return { ...state, activeChatId: action.chatId }

    case 'message/add-outgoing': {
      const list = state.messages[action.chatId] ?? []
      return {
        ...state,
        messages: { ...state.messages, [action.chatId]: [...list, action.message] },
      }
    }

    case 'message/sending':
      return updateMessage(state, action.chatId, action.id, { status: 'sending', error: undefined })

    case 'message/sent':
      return updateMessage(state, action.chatId, action.id, {
        status: 'sent',
        idMessage: action.idMessage,
        error: undefined,
      })

    case 'message/failed':
      return updateMessage(state, action.chatId, action.id, { status: 'failed', error: action.error })

    case 'message/incoming': {
      const { incoming } = action
      const chat = findChatForIncoming(state.chats, incoming)
      // Сообщения из чатов, которые не открыты в приложении, не показываем
      if (!chat) return state

      const list = state.messages[chat.chatId] ?? []
      // Защита от дубликатов: одно и то же уведомление может прийти повторно,
      // если DeleteNotification не успел выполниться
      if (list.some((message) => message.idMessage === incoming.idMessage)) return state

      const message: ChatMessage = {
        id: incoming.idMessage,
        idMessage: incoming.idMessage,
        direction: 'incoming',
        text: incoming.text,
        timestamp: incoming.timestamp,
        status: 'received',
      }
      const name = incoming.senderName || chat.name
      return {
        ...state,
        chats:
          name === chat.name
            ? state.chats
            : state.chats.map((item) => (item.chatId === chat.chatId ? { ...item, name } : item)),
        messages: { ...state.messages, [chat.chatId]: [...list, message] },
      }
    }
  }
}

function init(idInstance: string): ChatState {
  const saved = loadChats(idInstance)
  if (!saved) return { chats: [], messages: {}, activeChatId: null }

  // Если страницу перезагрузили во время отправки, результат запроса неизвестен
  const messages: Record<string, ChatMessage[]> = {}
  for (const [chatId, list] of Object.entries(saved.messages)) {
    messages[chatId] = list.map((message) =>
      message.status === 'sending'
        ? { ...message, status: 'failed', error: 'Отправка прервана перезагрузкой страницы' }
        : message,
    )
  }
  return { chats: saved.chats, messages, activeChatId: null }
}

/** Локальное состояние чатов и сообщений с сохранением в localStorage */
export function useChatStore(idInstance: string) {
  const [state, dispatch] = useReducer(reducer, idInstance, init)

  useEffect(() => {
    saveChats(idInstance, { chats: state.chats, messages: state.messages })
  }, [idInstance, state.chats, state.messages])

  const openChat = useCallback((chat: Chat) => dispatch({ type: 'chat/open', chat }), [])

  const selectChat = useCallback(
    (chatId: string | null) => dispatch({ type: 'chat/select', chatId }),
    [],
  )

  const addOutgoing = useCallback((chatId: string, message: ChatMessage) => {
    dispatch({ type: 'message/add-outgoing', chatId, message })
  }, [])

  const markSending = useCallback((chatId: string, id: string) => {
    dispatch({ type: 'message/sending', chatId, id })
  }, [])

  const markSent = useCallback((chatId: string, id: string, idMessage: string) => {
    dispatch({ type: 'message/sent', chatId, id, idMessage })
  }, [])

  const markFailed = useCallback((chatId: string, id: string, error: string) => {
    dispatch({ type: 'message/failed', chatId, id, error })
  }, [])

  const addIncoming = useCallback((incoming: IncomingText) => {
    dispatch({ type: 'message/incoming', incoming })
  }, [])

  return { state, openChat, selectChat, addOutgoing, markSending, markSent, markFailed, addIncoming }
}
