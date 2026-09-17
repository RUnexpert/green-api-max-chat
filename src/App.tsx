import { useState } from 'react'
import { ChatScreen } from './components/ChatScreen'
import { CredentialsForm } from './components/CredentialsForm'
import type { Credentials } from './types/chat'
import { clearSession, loadCredentials, saveCredentials } from './utils/storage'

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)
  const [warning, setWarning] = useState<string | null>(null)

  const handleLogin = (next: Credentials, settingsWarning: string | null) => {
    saveCredentials(next)
    setWarning(settingsWarning)
    setCredentials(next)
  }

  const handleLogout = () => {
    if (credentials) clearSession(credentials.idInstance)
    setWarning(null)
    setCredentials(null)
  }

  if (!credentials) {
    return <CredentialsForm onLogin={handleLogin} />
  }

  return (
    <ChatScreen
      // Новый экземпляр (и новый цикл получения) для каждого набора credentials
      key={`${credentials.apiUrl}|${credentials.idInstance}`}
      credentials={credentials}
      warning={warning}
      onDismissWarning={() => setWarning(null)}
      onLogout={handleLogout}
    />
  )
}
