"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Loader2, LayoutDashboard, BookOpen, 
  Settings, LogOut, PenTool, Book, BarChart3,
  Library,
  PieChart // <--- Icono para Balance General
} from 'lucide-react'
import Link from 'next/link'

export default function EscritorioLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setAuthorized(true)
      }
    }
    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!authorized) return (
    <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  )

  /**
   * MENU ACTUALIZADO
   * Se añade "Balance General" en la ruta /escritorio/balance-general
   */
  const menuItems = [
    { name: 'Inicio', icon: LayoutDashboard, path: '/escritorio' },
    { name: 'Crear Asiento', icon: Book, path: '/escritorio/libro-diario' },
    { name: 'Ver Libro Diario', icon: Library, path: '/escritorio/libro-diario/ver' },
    { name: 'Balance General', icon: PieChart, path: '/escritorio/balance-general' }, // <--- NUEVA RUTA
    { name: 'B. Comprobación', icon: BarChart3, path: '/escritorio/balance' },
    { name: 'Plantillas', icon: PenTool, path: '/escritorio/plantillas' },
    { name: 'Plan Contable', icon: BookOpen, path: '/escritorio/plan-contable' },
  ]

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* SIDEBAR PROFESIONAL */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-100">
            GC
          </div>
          <span className="font-black text-slate-800 tracking-tighter text-lg uppercase italic">Gestor</span>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* BOTÓN DE CONFIGURACIÓN */}
        <div className="space-y-1">
           <Link 
             href="/escritorio/ajustes"
             className={`flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${pathname === '/escritorio/ajustes' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <Settings size={18} />
             Ajustes
           </Link>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}