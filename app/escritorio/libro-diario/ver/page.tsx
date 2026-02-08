"use client"
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  RefreshCw, BookText, ChevronDown, 
  Search, Activity, ArrowUpDown
} from 'lucide-react'

export default function LibroDiarioAcordeonPage() {
  const [asientos, setAsientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [abiertoId, setAbiertoId] = useState<string | null>(null)
  const [esCreciente, setEsCreciente] = useState(false) 
  const isMounted = useRef(false)

  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true
    cargarLibroDiario()
    return () => { isMounted.current = false }
  }, [esCreciente])

  const cargarLibroDiario = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Traemos los asientos y apuntes (sin el join que falla)
      const { data: dataAsientos, error: errorAsientos } = await supabase
        .from('asientos')
        .select(`
          id, numero_asiento, fecha, glosa, total_monto,
          apuntes ( id, cuenta_codigo, debe, haber )
        `)
        .eq('user_id', user.id)
        .order('numero_asiento', { ascending: esCreciente })

      if (errorAsientos) throw errorAsientos

      // 2. Traemos los nombres de las cuentas del usuario
      const { data: dataCuentas, error: errorCuentas } = await supabase
        .from('mis_cuentas')
        .select('codigo, nombre')
        .eq('user_id', user.id)

      if (errorCuentas) throw errorCuentas

      // 3. Creamos un diccionario para búsqueda rápida: { "104111": "Meta - caja fuerte" }
      const nombresCuentas: Record<string, string> = {}
      dataCuentas?.forEach(c => {
        nombresCuentas[c.codigo] = c.nombre
      })

      // 4. Cruzamos los datos manualmente
      const asientosProcesados = dataAsientos.map(asiento => ({
        ...asiento,
        apuntes: asiento.apuntes.map((apunte: any) => ({
          ...apunte,
          nombre_cuenta: nombresCuentas[apunte.cuenta_codigo] || 'Cuenta no encontrada'
        }))
      }))

      setAsientos(asientosProcesados)
    } catch (err: any) {
      console.error("Error cargando libro diario:", err.message)
    } finally {
      setTimeout(() => setLoading(false), 500)
    }
  }

  const toggleAsiento = (id: string) => {
    setAbiertoId(abiertoId === id ? null : id)
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] gap-4">
      <RefreshCw className="animate-spin text-indigo-500" size={45} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic animate-pulse">
        reconstruyendo libro diario...
      </p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-4 md:p-10 font-sans tracking-tight text-slate-900">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <BookText size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Libro Diario Digital</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic lowercase first-letter:uppercase">
            Historial de Operaciones
          </h1>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setEsCreciente(!esCreciente)}
            className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <ArrowUpDown size={16} className="text-indigo-500" />
            Orden: {esCreciente ? 'Creciente' : 'Reciente'}
          </button>

          <button onClick={cargarLibroDiario} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
            <RefreshCw size={16} /> Sincronizar
          </button>
        </div>
      </header>

      {/* LISTA DE ASIENTOS */}
      <div className="max-w-5xl mx-auto space-y-4">
        {asientos.map((asiento) => (
          <div key={asiento.id} className={`bg-white rounded-[2rem] border transition-all duration-300 overflow-hidden ${abiertoId === asiento.id ? 'border-indigo-200 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
            <button onClick={() => toggleAsiento(asiento.id)} className="w-full p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xs font-black italic">
                  #{asiento.numero_asiento}
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{asiento.fecha}</span>
                  <h3 className="font-black text-slate-800 lowercase first-letter:uppercase italic text-sm">{asiento.glosa}</h3>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Total</p>
                  <p className="text-lg font-black text-slate-900 italic">s/ {Number(asiento.total_monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={`p-2 rounded-full transition-all ${abiertoId === asiento.id ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                  <ChevronDown size={18} />
                </div>
              </div>
            </button>

            <div className={`overflow-hidden transition-all duration-500 ${abiertoId === asiento.id ? 'max-h-[1000px] border-t border-slate-50 bg-slate-50/30' : 'max-h-0'}`}>
              <div className="p-8">
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-inner">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-800 text-white/50 font-black uppercase text-[8px]">
                        <th className="p-4 text-left tracking-widest">Cuenta / Descripción</th>
                        <th className="p-4 text-right tracking-widest">Debe</th>
                        <th className="p-4 text-right tracking-widest">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {asiento.apuntes?.map((apunte: any) => (
                        <tr key={apunte.id} className="group">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${apunte.debe > 0 ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                                <span className="font-mono font-black text-indigo-600">{apunte.cuenta_codigo}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold ml-3.5 lowercase italic">
                                {apunte.nombre_cuenta}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-black text-indigo-600">{apunte.debe > 0 ? `s/ ${Number(apunte.debe).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                          <td className="p-4 text-right font-black text-rose-500">{apunte.haber > 0 ? `s/ ${Number(apunte.haber).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}