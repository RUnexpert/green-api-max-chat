import { useState, type FormEvent } from 'react'
import { toErrorMessage } from '../utils/format'
import { parsePhone } from '../utils/phone'
import { PlusIcon } from './icons'

interface NewChatFormProps {
  /** Получает номер в формате 79991234567; при ошибке должен бросить исключение */
  onCreate: (phone: string) => Promise<void>
}

export function NewChatForm({ onCreate }: NewChatFormProps) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    const parsed = parsePhone(phone)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }

    setError(null)
    setLoading(true)
    try {
      await onCreate(parsed.phone)
      setPhone('')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="new-chat" onSubmit={handleSubmit} noValidate>
      <div className="new-chat__row">
        <input
          className="field__input new-chat__input"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="+7 999 123-45-67"
          aria-label="Номер телефона получателя"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            if (error) setError(null)
          }}
          disabled={loading}
        />
        <button
          className="button button--primary button--icon"
          type="submit"
          disabled={loading || !phone.trim()}
          aria-label="Создать чат"
          title="Создать чат"
        >
          {loading ? <span className="spinner" /> : <PlusIcon />}
        </button>
      </div>
      {error && (
        <p className="form-error form-error--compact" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
