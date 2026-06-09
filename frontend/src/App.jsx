import { useState } from 'react'
import { useAuth } from 'react-oidc-context'

function App() {
  const auth = useAuth()
  const [apiResult, setApiResult] = useState(null)
  const [apiError, setApiError] = useState(null)

  const fetchUsers = async () => {
    setApiError(null)
    setApiResult(null)

    try {
      const response = await fetch('http://localhost/users', {
        headers: {
          Authorization: `Bearer ${auth.user?.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setApiResult(data)
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Nieznany błąd')
    }
  }

  if (auth.isLoading) {
    return <p>Ładowanie...</p>
  }

  if (!auth.isAuthenticated) {
    return (
      <div>
        <button type="button" onClick={() => auth.signinRedirect()}>
          Zaloguj
        </button>
      </div>
    )
  }

  const username =
    auth.user?.profile?.preferred_username ??
    auth.user?.profile?.name ??
    'użytkowniku'

  return (
    <div>
      <p>Witaj, {username}</p>
      <button type="button" onClick={() => auth.signoutRedirect()}>
        Wyloguj
      </button>
      <button type="button" onClick={fetchUsers}>
        Pobierz użytkowników z API
      </button>
      {apiError && <pre>{apiError}</pre>}
      {apiResult && <pre>{JSON.stringify(apiResult, null, 2)}</pre>}
    </div>
  )
}

export default App
