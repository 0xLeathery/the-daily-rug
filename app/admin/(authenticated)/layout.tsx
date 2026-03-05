import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-brand-black">
      <nav className="bg-brand-black border-b-2 border-brand-red px-4 py-3 flex justify-between items-center">
        <strong className="font-display font-bold text-brand-yellow uppercase tracking-tight text-lg">
          THE DAILY RUG &mdash; ADMIN
        </strong>
        <span className="text-brand-white text-sm">{user.email}</span>
      </nav>
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
