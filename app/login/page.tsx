'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left Side */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12">
        <div className="max-w-lg text-white">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
              C
            </div>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            Manage your business from one dashboard.
          </h1>

          <p className="text-lg text-white/80">
            Monitor sales, customers, analytics, products and operations from a
            single modern workspace.
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome back
              </h2>
              <p className="text-slate-400">
                Sign in to your dashboard
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-center text-sm text-slate-500">
                Powered by coffee, panic, and Nasr.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}