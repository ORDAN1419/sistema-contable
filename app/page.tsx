import { redirect } from 'next/navigation'

export default function RootPage() {
  // Apenas alguien entre a sistema-contable.vercel.app, lo mandamos al login
  redirect('/login')
}