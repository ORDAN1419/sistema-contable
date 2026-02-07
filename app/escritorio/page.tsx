"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, Receipt, BookText, 
  Wallet, ArrowUpRight, Plus, 
  Clock, ArrowRightLeft, TrendingUp, PiggyBank,
  Loader2, Calculator 
} from 'lucide-react'

export default function EscritorioPrincipal() {
  const [userName, setUserName] = useState('usuario')
  const [asientosRecientes, setAsientosRecientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // DATOS FIJOS DEL DASHBOARD - AJUSTADOS A TU REALIDAD
  const [datosBalance, setDatosBalance] = useState({
    activoTotal: 4521.50,
    activoCirculante: 1021.50,
    inversiones: 3500.00,
    pasivoFinanciero: 0.00,
    patrimonio: 4521.50
  })

  useEffect(() => {
    cargarDatosDashboard()
  }, [])

  const cargarDatosDashboard = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserName(user.email?.split('@')[0] || 'usuario')

      // CONSULTA DIRECTA A LA TABLA 'asientos'
      const { data: asientos, error } = await supabase
        .from('asientos')
        .select('id, numero_asiento, glosa, total_monto, fecha')
        .eq('user_id', user.id)
        .order('numero_asiento', { ascending: false }) // Los más recientes arriba
        .limit(5)
      
      if (asientos) {
        // ASIGNACIÓN DIRECTA: Sin divisiones ni filtros de Map que alteren el monto
        setAsientosRecientes(asientos);
      }
    } catch (err) {
      console.error("Error en dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { 
      label: 'activo total', 
      value: `s/ ${datosBalance.activoTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 
      icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50',
      desc: `Capital total registrado`
    },
    { 
      label: 'pasivo financiero', 
      value: `s/ ${datosBalance.pasivoFinanciero.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 
      icon: Receipt, color: 'text-rose-500', bg: 'bg-rose-50',
      desc: 'Obligaciones pendientes'
    },
    { 
      label: 'capital neto', 
      value: `s/ ${datosBalance.patrimonio.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 
      icon: PiggyBank, color: 'text-indigo-500', bg: 'bg-indigo-50',
      desc: 'Patrimonio de la empresa'
    },
  ]

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 font-sans tracking-tight text-slate-900">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter lowercase first-letter:uppercase italic">
              hola, {userName}
            </h1>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] lowercase italic">
              resumen financiero de tus operaciones
            </p>
          </div>
          <a href="/escritorio/libro-diario" className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
            <Plus size={16} />
            nueva operación
          </a>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-all">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tighter italic">{stat.value}</p>
                <p className="text-[9px] font-bold text-slate-400 italic">{stat.desc}</p>
              </div>
              <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                <stat.icon size={22} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 italic">Libro diario (historial)</h2>
              </div>
              <a href="/escritorio/libro-diario" className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:underline">ver historial completo</a>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-6 text-[10px] uppercase tracking-widest text-center">nº</th>
                    <th className="p-6 text-[10px] uppercase tracking-widest">glosa / detalle</th>
                    <th className="p-6 text-[10px] uppercase tracking-widest text-right">monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="p-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-slate-300" size={24} />
                      </td>
                    </tr>
                  ) : asientosRecientes.length > 0 ? (
                    asientosRecientes.map((asiento) => (
                      <tr key={asiento.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-6 text-center">
                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg italic">
                            #{asiento.numero_asiento}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 lowercase first-letter:uppercase italic">{asiento.glosa}</span>
                            <span className="text-[9px] text-slate-400 font-medium italic">{asiento.fecha}</span>
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <span className="text-sm font-black text-slate-900 italic">
                            s/ {Number(asiento.total_monto || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-[10px] font-bold text-slate-300 uppercase italic">
                        no hay registros encontrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <section className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800 italic px-2">Accesos rápidos</h2>
              <div className="grid grid-cols-1 gap-4">
                <ShortcutCard title="libro diario" desc="registrar nuevos asientos" url="/escritorio/libro-diario" icon={<ArrowRightLeft size={18}/>} />
                <ShortcutCard title="balance" desc="comprobación de sumas" url="/escritorio/comprobacion" icon={<Calculator size={18}/>} />
              </div>
            </section>

            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
              <div className="relative z-10 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Capital inicial</p>
                <h3 className="text-3xl font-black italic">s/ {datosBalance.patrimonio.toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
                <p className="text-[10px] font-medium opacity-60 lowercase mt-2 italic text-indigo-100">Estado patrimonial actual</p>
              </div>
              <PiggyBank className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function ShortcutCard({ title, desc, url, icon }: any) {
  return (
    <a href={url} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex items-center gap-5 group">
      <div className="text-indigo-500 bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-slate-800 text-sm lowercase first-letter:uppercase italic">{title}</h3>
        <p className="text-slate-400 text-[10px] font-medium leading-tight lowercase italic">{desc}</p>
      </div>
      <ArrowUpRight className="text-slate-200 group-hover:text-indigo-50 group-hover:text-indigo-500 transition-colors" size={16} />
    </a>
  )
}