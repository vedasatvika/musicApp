import { useState } from 'react'
import { useStore } from '../store'

type Mode = 'in' | 'up'

export function AuthScreen() {
  const { signIn, signUp } = useStore()
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'in') {
        const { error } = await signIn(email.trim(), password)
        if (error) setError(error)
      } else {
        const { error } = await signUp({ email: email.trim(), password, name, handle })
        if (error) setError(error)
        else {
          // If email confirmation is on, there's no session yet.
          setNotice('Account created! If it doesn\'t log you in, check your email to confirm, then sign in.')
          setMode('in')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="logo auth-logo">Tempo</h1>
        <p className="subtle auth-tag">Rank music. Compare taste. Follow friends.</p>

        <div className="seg auth-seg">
          <button className={`seg-btn${mode === 'in' ? ' active' : ''}`} onClick={() => setMode('in')} type="button">
            Log in
          </button>
          <button className={`seg-btn${mode === 'up' ? ' active' : ''}`} onClick={() => setMode('up')} type="button">
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'up' && (
            <>
              <input
                className="text-input" placeholder="Display name" value={name}
                onChange={(e) => setName(e.target.value)} required autoCapitalize="words"
              />
              <div className="handle-field">
                <span className="handle-at">@</span>
                <input
                  className="text-input handle-input" placeholder="handle" value={handle}
                  onChange={(e) => setHandle(e.target.value)} required
                  autoCapitalize="none" autoCorrect="off"
                />
              </div>
            </>
          )}
          <input
            className="text-input" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoCapitalize="none" autoCorrect="off"
          />
          <input
            className="text-input" type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6}
          />

          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}

          <button className="primary-btn" type="submit" disabled={busy}>
            {busy ? 'One sec…' : mode === 'in' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
