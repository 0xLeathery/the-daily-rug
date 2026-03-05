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
    <div>
      <nav style={{ padding: '12px 20px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>The Daily Rug - Admin</strong>
        <span>{user.email}</span>
      </nav>
      <main style={{ padding: 20 }}>
        {children}
      </main>
    </div>
  )
}
