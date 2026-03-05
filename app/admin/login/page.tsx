'use client'
import { loginAction } from './actions'
import { useActionState } from 'react'

const initialState = { error: '' }

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await loginAction(formData)
      return result ?? { error: '' }
    },
    initialState
  )

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Admin Login</h1>
      <form action={formAction}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <br />
          <input id="email" name="email" type="email" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password">Password</label>
          <br />
          <input id="password" name="password" type="password" required style={{ width: '100%', padding: 8 }} />
        </div>
        {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
        <button type="submit" disabled={pending} style={{ padding: '8px 16px' }}>
          {pending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
