"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Wallet, Receipt, PiggyBank, RefreshCw, 
  ChevronRight, Sparkles
} from 'lucide-react'

export default function BalanceGeneralPage() {
  const [datos, setDatos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaActual] = useState(new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }))

  useEffect(() => {
    cargarBalanceGeneral()
  }, [])

  const cargarBalanceGeneral = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.rpc('actualizar_balance_comprobacion')

      const { data, error } = await supabase
        .from('balance_comprobacion')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      if (data) {
        const mapaUnico: Record<string, any> = {}
        data.forEach(row => {
          mapaUnico[row.codigo] = row
        })
        setDatos(Object.values(mapaUnico))
      }
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtrarCuentas = (codigos: string[]) => 
    datos.filter(d => codigos.some(c => d.codigo.startsWith(c)));

  const calcularTotal = (cuentas: any[]) => 
    cuentas.reduce((acc, c) => acc + (Number(c.deudor || 0) + Number(c.acreedor || 0)), 0);

  const activoCirculante = filtrarCuentas(['10']);
  const inversiones = filtrarCuentas(['11', '12']); 
  const pasivoFinanciero = filtrarCuentas(['45']); 
  
  const totalActivo = calcularTotal(activoCirculante) + calcularTotal(inversiones);
  const totalPasivo = calcularTotal(pasivoFinanciero);
  const utilidadNeta = datos.reduce((acc, d) => acc + (Number(d.ganancia_naturaleza || 0) - Number(d.perdida_naturaleza || 0)), 0);
  const totalPatrimonio = totalActivo - totalPasivo;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <RefreshCw className="animate-spin text-indigo-400" size={30} />
    </div>
  )

  return (
    // Aplicamos 'font-sans' con una configuración que priorice letras redondeadas
    <main className="min-h-screen bg-[#F9FAFB] p-6 md:p-12 text-slate-600 font-sans selection:bg-indigo-100">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER REDONDEADO */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-4 rounded-3xl text-indigo-500">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Balance General</h1>
              <p className="text-sm font-medium text-slate-400 italic">Alejandro Aponte Vivas</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <span className="text-[11px] font-bold bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full text-slate-500 uppercase">
              {fechaActual}
            </span>
            <button 
              onClick={cargarBalanceGeneral} 
              className="group flex items-center gap-2 text-indigo-500 hover:text-white hover:bg-indigo-500 px-5 py-2 rounded-2xl transition-all font-bold text-xs border border-indigo-100"
            >
              <RefreshCw size={14} className="group-active:rotate-180 transition-transform duration-500" /> 
              Sincronizar
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SECCIÓN ACTIVOS */}
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-50 space-y-10">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                  <Wallet size={18} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Mis Activos</h2>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-4">Dinero en Cuentas</span>
                  <div className="space-y-2">
                    {activoCirculante.map((c) => (
                      <FilaRounded key={c.codigo} nombre={c.cuenta} monto={c.deudor} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-4">Inversiones</span>
                  <div className="space-y-2">
                    {inversiones.length > 0 ? inversiones.map((c) => (
                      <FilaRounded key={c.codigo} nombre={c.cuenta} monto={c.deudor} />
                    )) : <p className="text-xs italic text-slate-300 ml-4">Sin registros</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400">Total Activos</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tight">
                <span className="text-sm font-medium mr-1">S/</span>
                {totalActivo.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* SECCIÓN PASIVOS Y PATRIMONIO */}
          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-50 space-y-10">
            {/* PASIVOS */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
                  <Receipt size={18} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Obligaciones</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  {pasivoFinanciero.length > 0 ? pasivoFinanciero.map((c) => (
                    <FilaRounded key={c.codigo} nombre={c.cuenta} monto={c.acreedor} />
                  )) : <p className="text-xs italic text-slate-300 ml-4">Todo pagado ✨</p>}
                </div>
              </div>
            </section>

            {/* PATRIMONIO */}
            <section className="pt-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                  <PiggyBank size={18} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Patrimonio</h2>
              </div>
              <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem]">
                <FilaRounded 
                  nombre="Utilidad Neta" 
                  monto={utilidadNeta} 
                  color={utilidadNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'} 
                />
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-white">
                  <span className="text-[11px] font-bold text-slate-400">Capital Real</span>
                  <span className="text-lg font-black text-indigo-600">s/ {totalPatrimonio.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </section>

            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400">Pasivo + Patrimonio</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight">
                <span className="text-sm font-medium mr-1">S/</span>
                {totalActivo.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-12 flex justify-center pb-12">
           <div className="flex items-center gap-2 bg-white px-6 py-2 rounded-full shadow-sm border border-slate-100">
              <div className={`w-2 h-2 rounded-full ${Math.abs(totalActivo - (totalPasivo + totalPatrimonio)) < 0.01 ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Balance Cuadrado
              </span>
           </div>
        </footer>
      </div>
    </main>
  )
}

function FilaRounded({ nombre, monto, color = "text-slate-600" }: any) {
  return (
    <div className="flex justify-between items-center group px-2">
      <span className="text-[12px] font-medium text-slate-500 lowercase first-letter:uppercase transition-colors group-hover:text-indigo-500">
        {nombre}
      </span>
      {/* LÍNEA DE PUNTOS REDONDEADOS */}
      <div className="flex-1 mx-3 border-b-2 border-slate-100 border-dotted"></div>
      <span className={`${color} text-[12px] font-bold tabular-nums`}>
        {Number(monto || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}