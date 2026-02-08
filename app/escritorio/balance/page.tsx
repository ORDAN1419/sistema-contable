"use client"
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  RefreshCw, Calculator, FileText, CheckCircle2, 
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Gauge 
} from 'lucide-react'

export default function BalanceComprobacionPage() {
  const [datos, setDatos] = useState<any[]>([])
  // Iniciamos en true para que la "bolita" aparezca al entrar
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(false)

  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true
    
    cargarBalance()

    return () => {
      isMounted.current = false
    }
  }, [])

  const cargarBalance = async () => {
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Ejecutamos el motor en la base de datos
      await supabase.rpc('actualizar_balance_comprobacion')
      
      const { data, error } = await supabase
        .from('balance_comprobacion')
        .select('*')
        .eq('user_id', user.id) 
        .order('codigo', { ascending: true })

      if (error) throw error
      setDatos(data || [])
    } catch (err: any) {
      console.error("Error cargando balance:", err.message)
    } finally {
      // Ocultamos la bolita después de un breve delay para que la transición sea suave
      setTimeout(() => {
        setLoading(false)
      }, 500);
    }
  }

  const formatCelda = (valor: number) => {
    return valor !== 0 ? `s/ ${Math.abs(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  }

  // Cálculos de totales
  const totales = datos.reduce((acc, f) => ({
    debe: acc.debe + Number(f.debe || 0),
    haber: acc.haber + Number(f.haber || 0),
    deudor: acc.deudor + Number(f.deudor || 0),
    acreedor: acc.acreedor + Number(f.acreedor || 0),
    activo: acc.activo + Number(f.activo || 0),
    pasivo: acc.pasivo + Number(f.pasivo || 0),
    pn: acc.pn + Number(f.perdida_naturaleza || 0),
    gn: acc.gn + Number(f.ganancia_naturaleza || 0),
    pf: acc.pf + Number(f.perdida_funcion || 0),
    gf: acc.gf + Number(f.ganancia_funcion || 0),
  }), { debe: 0, haber: 0, deudor: 0, acreedor: 0, activo: 0, pasivo: 0, pn: 0, gn: 0, pf: 0, gf: 0 })

  const utilidadNeta = totales.gn - totales.pn
  const diferenciaSumas = Math.abs(totales.debe - totales.haber)
  const diferenciaSaldos = Math.abs(totales.deudor - totales.acreedor)

  // --- ESTADO DE CARGA (LA BOLITA) ---
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] gap-4">
      <RefreshCw className="animate-spin text-indigo-500" size={45} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic animate-pulse">
        calculando saldos contables...
      </p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-4 md:p-10 font-sans tracking-tight text-slate-900">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Gauge size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">reportes financieros</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic lowercase first-letter:uppercase">Balance de comprobación</h1>
        </div>
        
        <button 
          onClick={cargarBalance} 
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50 active:scale-95"
        >
          <RefreshCw size={16} />
          actualizar balance
        </button>
      </header>

      {/* DASHBOARD DE VALIDACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className={`p-6 rounded-[2.5rem] border transition-all ${diferenciaSumas < 0.01 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50 border-rose-200 shadow-md animate-pulse'}`}>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel 1: Sumas</p>
            {diferenciaSumas < 0.01 ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertTriangle className="text-rose-500" size={18} />}
          </div>
          <h3 className="text-2xl font-black italic lowercase">{diferenciaSumas < 0.01 ? 'cuadrado' : 'descuadrado'}</h3>
          <p className="text-[11px] font-bold text-slate-500 mt-2 italic">Diferencia: s/ {diferenciaSumas.toFixed(2)}</p>
        </div>

        <div className={`p-6 rounded-[2.5rem] border transition-all ${diferenciaSaldos < 0.01 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50 border-rose-200 shadow-md animate-pulse'}`}>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel 2: Saldos</p>
            {diferenciaSaldos < 0.01 ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertTriangle className="text-rose-500" size={18} />}
          </div>
          <h3 className="text-2xl font-black italic lowercase">{diferenciaSaldos < 0.01 ? 'cuadrado' : 'descuadrado'}</h3>
          <p className="text-[11px] font-bold text-slate-500 mt-2 italic">Diferencia: s/ {diferenciaSaldos.toFixed(2)}</p>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Calculator size={80} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resultado del periodo</p>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <h3 className={`text-3xl font-black italic ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                s/ {Math.abs(utilidadNeta).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-widest mt-2 text-slate-300 italic">
                {utilidadNeta >= 0 ? 'utilidad neta' : 'pérdida neta'}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${utilidadNeta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {utilidadNeta >= 0 ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-900 text-white italic">
                <th className="p-4 border-r border-slate-800 text-left" rowSpan={2}>código</th>
                <th className="p-4 border-r border-slate-800 text-left" rowSpan={2}>cuenta</th>
                <th className="p-2 border-r border-slate-800 text-center uppercase text-[8px]" colSpan={2}>sumas mayores</th>
                <th className="p-2 border-r border-slate-800 text-center uppercase text-[8px]" colSpan={2}>saldos</th>
                <th className="p-2 border-r border-slate-800 text-center uppercase text-[8px]" colSpan={2}>Balance</th>
                <th className="p-2 border-r border-slate-800 text-center uppercase text-[8px]" colSpan={2}>r. naturaleza</th>
                <th className="p-2 text-center uppercase text-[8px]" colSpan={2}>r. función</th>
              </tr>
              <tr className="bg-slate-800 text-slate-300">
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">DEBE</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">HABER</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">DEUDOR</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">ACREEDOR</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">ACTIVO</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">PASIVO</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">PÉRDIDA</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">GANANCIA</th>
                <th className="p-3 border-r border-slate-700 text-center text-[8px]">PÉRDIDA</th>
                <th className="p-3 text-center text-[8px]">GANANCIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 font-mono text-indigo-600 font-black border-r group-hover:bg-indigo-50/30">{f.codigo}</td>
                  <td className="p-3 font-black border-r text-slate-700 lowercase first-letter:uppercase italic group-hover:bg-indigo-50/30">{f.cuenta}</td>
                  <td className="p-3 text-right border-r">{formatCelda(f.debe)}</td>
                  <td className="p-3 text-right border-r">{formatCelda(f.haber)}</td>
                  <td className="p-3 text-right border-r font-black text-indigo-600 bg-indigo-50/10">{formatCelda(f.deudor)}</td>
                  <td className="p-3 text-right border-r font-black text-rose-600 bg-rose-50/10">{formatCelda(f.acreedor)}</td>
                  <td className="p-3 text-right border-r bg-slate-50/30">{formatCelda(f.activo)}</td>
                  <td className="p-3 text-right border-r bg-slate-50/30">{formatCelda(f.pasivo)}</td>
                  <td className="p-3 text-right border-r text-rose-500">{formatCelda(f.perdida_naturaleza)}</td>
                  <td className="p-3 text-right border-r text-emerald-600">{formatCelda(f.ganancia_naturaleza)}</td>
                  <td className="p-3 text-right border-r text-rose-500">{formatCelda(f.perdida_funcion)}</td>
                  <td className="p-3 text-right text-emerald-600">{formatCelda(f.ganancia_funcion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}