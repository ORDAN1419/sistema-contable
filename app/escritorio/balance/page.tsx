"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  RefreshCw, Calculator, FileText, CheckCircle2, 
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Gauge 
} from 'lucide-react'

export default function BalanceComprobacionPage() {
  const [datos, setDatos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarBalance()
  }, [])

  const cargarBalance = async () => {
    setLoading(true)
    // 1. Ejecutamos el motor en la base de datos para recalcular todo
    await supabase.rpc('actualizar_balance_comprobacion')
    
    // 2. Traemos los datos procesados
    const { data } = await supabase
      .from('balance_comprobacion')
      .select('*')
      .order('codigo', { ascending: true })

    if (data) setDatos(data)
    setLoading(false)
  }

  // Función para limpiar ceros y negativos con un guion
  const formatCelda = (valor: number) => {
    return valor > 0 ? `s/ ${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  }

  // Cálculos de totales para validación
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

  const utilidadNeta = totales.gn - totales.pn;
  const diferenciaSumas = Math.abs(totales.debe - totales.haber);
  const diferenciaSaldos = Math.abs(totales.deudor - totales.acreedor);

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-4 md:p-10 font-sans tracking-tight text-slate-900">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <Gauge size={20} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] lowercase">reportes financieros</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter lowercase first-letter:uppercase italic">Balance de comprobación</h1>
        </div>
        
        <button 
          onClick={cargarBalance} 
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] lowercase italic shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'sincronizando...' : 'actualizar balance'}
        </button>
      </header>

      {/* --- SECCIÓN DE VALIDACIÓN (AHORA ARRIBA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* NIVEL 1: SUMAS MAYORES */}
        <div className={`p-6 rounded-[2.5rem] border transition-all ${diferenciaSumas < 0.01 ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' : 'bg-rose-50 border-rose-200 shadow-md animate-pulse'}`}>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">nivel 1: sumas</p>
            {diferenciaSumas < 0.01 ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertTriangle className="text-rose-500" size={18} />}
          </div>
          <h3 className="text-2xl font-black italic lowercase">{diferenciaSumas < 0.01 ? 'cuadrado' : 'descuadrado'}</h3>
          <p className="text-[11px] font-bold text-slate-500 mt-2 italic">diferencia: s/ {diferenciaSumas.toFixed(2)}</p>
        </div>

        {/* NIVEL 2: SALDOS */}
        <div className={`p-6 rounded-[2.5rem] border transition-all ${diferenciaSaldos < 0.01 ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' : 'bg-rose-50 border-rose-200 shadow-md animate-pulse'}`}>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">nivel 2: saldos</p>
            {diferenciaSaldos < 0.01 ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertTriangle className="text-rose-500" size={18} />}
          </div>
          <h3 className="text-2xl font-black italic lowercase">{diferenciaSaldos < 0.01 ? 'cuadrado' : 'descuadrado'}</h3>
          <p className="text-[11px] font-bold text-slate-500 mt-2 italic">diferencia: s/ {diferenciaSaldos.toFixed(2)}</p>
        </div>

        {/* NIVEL 3: RESULTADO FINAL */}
        <div className="p-6 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Calculator size={80} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">resultado del periodo</p>
          <div className="flex items-end justify-between relative z-10">
            <div>
              <h3 className={`text-3xl font-black italic ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                s/ {Math.abs(utilidadNeta).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-2 text-slate-300">
                {utilidadNeta >= 0 ? 'utilidad neta acumulada' : 'pérdida neta acumulada'}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${utilidadNeta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {utilidadNeta >= 0 ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
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
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">debe</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">haber</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">deudor</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">acreedor</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">activo</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">pasivo</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">pérdida</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">ganancia</th>
              <th className="p-3 border-r border-slate-700 text-center uppercase text-[7px]">pérdida</th>
              <th className="p-3 text-center uppercase text-[7px]">ganancia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datos.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono text-indigo-600 font-bold border-r">{f.codigo}</td>
                <td className="p-3 font-bold border-r text-slate-700 lowercase first-letter:uppercase italic">{f.cuenta}</td>
                <td className="p-3 text-right border-r">{formatCelda(f.debe)}</td>
                <td className="p-3 text-right border-r">{formatCelda(f.haber)}</td>
                <td className="p-3 text-right border-r font-bold text-indigo-600 bg-indigo-50/5">{formatCelda(f.deudor)}</td>
                <td className="p-3 text-right border-r font-bold text-rose-600 bg-rose-50/5">{formatCelda(f.acreedor)}</td>
                <td className="p-3 text-right border-r bg-slate-50/30">{formatCelda(f.activo)}</td>
                <td className="p-3 text-right border-r bg-slate-50/30">{formatCelda(f.pasivo)}</td>
                <td className="p-3 text-right border-r text-rose-500">{formatCelda(f.perdida_naturaleza)}</td>
                <td className="p-3 text-right border-r text-emerald-600">{formatCelda(f.ganancia_naturaleza)}</td>
                <td className="p-3 text-right border-r text-rose-500">{formatCelda(f.perdida_funcion)}</td>
                <td className="p-3 text-right text-emerald-600">{formatCelda(f.ganancia_funcion)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black italic border-t-2 border-slate-700">
            <tr>
              <td className="p-4 text-right uppercase text-[8px]" colSpan={2}>totales acumulados</td>
              <td className="p-4 text-right border-l border-slate-700">{formatCelda(totales.debe)}</td>
              <td className="p-4 text-right border-l border-slate-700">{formatCelda(totales.haber)}</td>
              <td className="p-4 text-right border-l border-slate-700 text-indigo-300">{formatCelda(totales.deudor)}</td>
              <td className="p-4 text-right border-l border-slate-700 text-rose-300">{formatCelda(totales.acreedor)}</td>
              <td className="p-4 text-right border-l border-slate-700">{formatCelda(totales.activo)}</td>
              <td className="p-4 text-right border-l border-slate-700">{formatCelda(totales.pasivo)}</td>
              <td className="p-4 text-right border-l border-slate-700 text-rose-300">{formatCelda(totales.pn)}</td>
              <td className="p-4 text-right border-l border-slate-700 text-emerald-300">{formatCelda(totales.gn)}</td>
              <td className="p-4 text-right border-l border-slate-700 text-rose-300">{formatCelda(totales.pf)}</td>
              <td className="p-4 text-right border-l border-slate-700 text-emerald-300">{formatCelda(totales.gf)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {datos.length === 0 && !loading && (
        <div className="mt-20 text-center space-y-4 opacity-30">
          <FileText size={60} className="mx-auto" />
          <p className="font-bold text-xs uppercase tracking-widest">sin datos para mostrar</p>
        </div>
      )}
    </main>
  )
}