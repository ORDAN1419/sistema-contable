import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirección automática al Login
  redirect('/login')
}