import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendIcon } from './icons'

/** Ограничение SendMessage: не более 4000 символов */
const MAX_MESSAGE_LENGTH = 4000
const MAX_TEXTAREA_HEIGHT = 160

interface MessageInputProps {
  onSend: (text: string) => void
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const message = text.trim()
  const tooLong = message.length > MAX_MESSAGE_LENGTH
  const canSend = message.length > 0 && !tooLong

  // Высота поля подстраивается под текст
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [text])

  const submit = () => {
    if (!canSend) return
    onSend(message)
    setText('')
    textareaRef.current?.focus()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit()
  }

  // Enter — отправить, Shift+Enter — новая строка
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer__field">
        <textarea
          ref={textareaRef}
          className="composer__input"
          rows={1}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {message.length > MAX_MESSAGE_LENGTH - 200 && (
          <span className={`composer__counter${tooLong ? ' composer__counter--error' : ''}`}>
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <button
        className="button button--primary button--icon composer__send"
        type="submit"
        disabled={!canSend}
        aria-label="Отправить"
        title="Отправить (Enter)"
      >
        <SendIcon />
      </button>
    </form>
  )
}
