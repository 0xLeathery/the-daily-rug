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
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <p className="text-brand-red font-display font-bold uppercase tracking-widest text-sm mb-2">
            THE DAILY RUG
          </p>
          <h1 className="text-4xl font-display font-black text-brand-yellow uppercase tracking-tight">
            ADMIN ACCESS
          </h1>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block uppercase text-sm font-bold text-brand-white tracking-wider mb-2"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-gray-900 border border-brand-red text-brand-white p-3 focus:outline-none focus:ring-2 focus:ring-brand-yellow placeholder-gray-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block uppercase text-sm font-bold text-brand-white tracking-wider mb-2"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-gray-900 border border-brand-red text-brand-white p-3 focus:outline-none focus:ring-2 focus:ring-brand-yellow placeholder-gray-600"
            />
          </div>

          {state.error && (
            <p className="text-brand-red font-bold text-sm uppercase tracking-wide">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand-red text-brand-white font-display font-bold uppercase tracking-wider p-3 text-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  )
}
