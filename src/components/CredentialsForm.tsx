import { useState, type FormEvent } from 'react'
import { getDefaultApiUrl, verifyInstance } from '../api/greenApi'
import type { Credentials } from '../types/chat'
import { toErrorMessage } from '../utils/format'

interface CredentialsFormProps {
  onLogin: (credentials: Credentials, warning: string | null) => void
}

export function CredentialsForm({ onLogin }: CredentialsFormProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedId = idInstance.trim()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    const token = apiTokenInstance.trim()
    if (!/^\d+$/.test(trimmedId)) {
      setError('idInstance должен состоять только из цифр')
      return
    }
    if (!token) {
      setError('Введите apiTokenInstance')
      return
    }
    const host = apiUrl.trim() || getDefaultApiUrl(trimmedId)
    if (!/^https?:\/\/[^\s/]+/i.test(host)) {
      setError('apiUrl должен начинаться с https://')
      return
    }

    const credentials: Credentials = { apiUrl: host, idInstance: trimmedId, apiTokenInstance: token }
    setError(null)
    setLoading(true)
    try {
      const { warning } = await verifyInstance(credentials)
      onLogin(credentials, warning)
    } catch (err) {
      setError(toErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={handleSubmit} noValidate>
        <div className="auth__logo" aria-hidden="true" />
        <h1 className="auth__title">Вход в GREEN-API</h1>
        <p className="auth__subtitle">
          Введите параметры инстанса MAX из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета
          </a>
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            name="idInstance"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Например, 3100000000"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            disabled={loading}
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            name="apiTokenInstance"
            type="password"
            autoComplete="off"
            placeholder="Ключ доступа инстанса"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            disabled={loading}
          />
        </label>

        <details className="auth__advanced">
          <summary>apiUrl инстанса</summary>
          <label className="field">
            <span className="field__label">
              Если в личном кабинете указан другой apiUrl, введите его здесь
            </span>
            <input
              className="field__input"
              name="apiUrl"
              type="url"
              autoComplete="off"
              placeholder={
                /^\d{4}/.test(trimmedId) ? getDefaultApiUrl(trimmedId) : 'https://3100.api.green-api.com'
              }
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              disabled={loading}
            />
          </label>
        </details>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button button--primary button--block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" aria-label="Проверка" /> : 'Войти'}
        </button>
      </form>
    </div>
  )
}
