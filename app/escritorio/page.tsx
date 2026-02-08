"use client"
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, ArrowRightLeft, PiggyBank,
  Calculator, Activity, 
  ShieldAlert, CreditCard, Wallet2,
  TrendingUp, TrendingDown, Wallet, Receipt, ArrowUpRight, RefreshCw
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts'

export default function EscritorioPrincipal() {
  const [userName, setUserName] = useState('usuario')
  const [asientosRecientes, setAsientosRecientes] = useState<any[]>([])
  const [cuentasLiquidez, setCuentasLiquidez] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const isMounted = useRef(false)
  
  const [metricas, setMetricas] = useState({
    activoTotal: 0,
    pasivoTotal: 0,
    patrimonio: 0,
    utilidad: 0
  })

  const [datosGrafico, setDatosGrafico] = useState<any[]>([])

  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true
    cargarDatosDashboard()
    return () => { isMounted.current = false }
  }, [])

  const cargarDatosDashboard = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserName(user.email?.split('@')[0] || 'usuario')
      await supabase.rpc('actualizar_balance_comprobacion')

      const { data: balanceData } = await supabase
        .from('balance_comprobacion')
        .select('*')
        .eq('user_id', user.id)

      if (balanceData) {
        // SOLUCIÓN AL ERROR DE KEYS: Usar Map para asegurar UNICIDAD por código
        const mapaUnico = new Map();
        balanceData.forEach(row => {
          if (row.codigo.startsWith('10')) {
            if (!mapaUnico.has(row.codigo)) {
              mapaUnico.set(row.codigo, {
                ...row,
                esEmergencia: row.codigo === '104111',
                esEfectivo: row.codigo.startsWith('101')
              });
            }
          }
        });

        const liquidezUnica = Array.from(mapaUnico.values()).sort((a: any, b: any) => 
          a.codigo.localeCompare(b.codigo)
        );
        setCuentasLiquidez(liquidezUnica);

        // Métricas sinceras
        const totalActivoReal = balanceData
          .filter(row => row.codigo.startsWith('10'))
          .reduce((acc, row) => acc + Number(row.activo || 0), 0);
        
        const totalPasivoFinanciero = balanceData
          .filter(row => row.codigo.startsWith('45'))
          .reduce((acc, row) => acc + Number(row.pasivo || 0), 0);

        const totalGanancia = balanceData.reduce((acc, row) => acc + Number(row.ganancia_naturaleza || 0), 0);
        const totalPerdida = balanceData.reduce((acc, row) => acc + Number(row.perdida_naturaleza || 0), 0);

        setMetricas({
          activoTotal: totalActivoReal,
          pasivoTotal: totalPasivoFinanciero,
          patrimonio: totalActivoReal - totalPasivoFinanciero,
          utilidad: totalGanancia - totalPerdida
        });
      }

      const { data: asientos } = await supabase
        .from('asientos')
        .select('id, numero_asiento, glosa, total_monto, fecha')
        .eq('user_id', user.id)
        .order('fecha', { ascending: true });
      
      if (asientos) {
        setAsientosRecientes([...asientos].reverse().slice(0, 5));
        const tendencia = asientos.map(a => ({
          name: new Date(a.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
          monto: a.total_monto
        }));
        setDatosGrafico(tendencia);
      }
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSync = async () => {
    setSyncing(true);
    await cargarDatosDashboard();
    setSyncing(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <RefreshCw className="animate-spin text-indigo-500" size={40} />
    </div>
  )

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 font-sans tracking-tight text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic lowercase first-letter:uppercase">
              hola, {userName}
            </h1>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] italic">análisis de liquidez real</p>
          </div>
          <div className="flex gap-4">
            <a href="/escritorio/balance" className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-[10px] uppercase hover:bg-slate-50 transition-all">
              <Calculator size={16} /> ver balance de comprobación
            </a>
            <a href="/escritorio/libro-diario" className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
              <Plus size={16} /> nueva operación
            </a>
          </div>
        </header>

        {/* MÉTRICAS SUPERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsData(metricas).map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-all">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tighter italic">{stat.value}</p>
                <p className="text-[9px] font-bold text-slate-400 italic">{stat.desc}</p>
              </div>
              <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-all`}>
                <stat.icon size={22} />
              </div>
            </div>
          ))}
        </div>

        {/* TENDENCIA */}
        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-lg font-bold text-slate-800 italic flex items-center gap-3">
              <TrendingUp className="text-indigo-500" size={20} /> Tendencia de Flujo
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datosGrafico}>
                <defs>
                  <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="monto" stroke="#6366f1" strokeWidth={4} fill="url(#colorMonto)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* DISPONIBILIDAD */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-slate-800 italic flex items-center gap-2">
              <Wallet2 size={18} className="text-indigo-500" /> Monitor de disponibilidad
            </h2>
            <button onClick={handleSync} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'sincronizando...' : 'actualizar'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cuentasLiquidez.map((cuenta) => (
              <div key={cuenta.codigo} className={`p-6 rounded-[2.5rem] border-2 flex flex-col justify-between min-h-[12rem] ${cuenta.esEmergencia ? 'bg-slate-900 border-slate-800 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-xl ${cuenta.esEmergencia ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-50 text-slate-400'}`}>
                    {cuenta.esEmergencia ? <ShieldAlert size={18} /> : (cuenta.esEfectivo ? <Wallet2 size={18} /> : <CreditCard size={18} />)}
                  </div>
                  <span className="text-[8px] font-black opacity-40">{cuenta.codigo}</span>
                </div>
                <div className="mt-4">
                  <p className="text-[7px] font-black uppercase mb-1 tracking-widest opacity-60">
                    {cuenta.esEmergencia ? 'Reserva' : (cuenta.esEfectivo ? 'Billetera' : 'Banco')}
                  </p>
                  <h3 className="text-[11px] font-black lowercase italic mb-2 line-clamp-2">{cuenta.cuenta}</h3>
                  <p className={`text-xl font-black italic ${cuenta.esEmergencia ? 'text-emerald-400' : 'text-indigo-600'}`}>
                    s/ {Number(cuenta.deudor || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN INFERIOR: MOVIMIENTOS Y RENDIMIENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 italic px-2 flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" /> Movimientos Recientes
            </h2>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-6 text-[10px] uppercase text-center">ref</th>
                    <th className="p-6 text-[10px] uppercase">detalle</th>
                    <th className="p-6 text-[10px] uppercase text-right">monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {asientosRecientes.map((asiento) => (
                    <tr key={asiento.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-6 text-center">
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-xl italic">#{asiento.numero_asiento}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700 lowercase italic">{asiento.glosa}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{asiento.fecha}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right font-black italic">s/ {Number(asiento.total_monto || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <section className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 text-white relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">rendimiento mensual</p>
                  <h3 className={`text-4xl font-black italic tracking-tighter ${metricas.utilidad >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    s/ {Math.abs(metricas.utilidad).toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </h3>
                  <p className="text-[10px] font-bold opacity-60 lowercase mt-2 italic">
                    {metricas.utilidad >= 0 ? 'utilidad neta' : 'pérdida neta'}
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase w-fit ${metricas.utilidad >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {metricas.utilidad >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {metricas.utilidad >= 0 ? 'creciendo' : 'alerta'}
                </div>
              </div>
              <Activity className="absolute -right-6 -bottom-6 text-white/5" size={180} />
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function statsData(metricas: any) {
  return [
    { label: 'disponibilidad real', value: `s/ ${metricas.activoTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Dinero real' },
    { label: 'deuda financiera', value: `s/ ${metricas.pasivoTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`, icon: Receipt, color: 'text-rose-500', bg: 'bg-rose-50', desc: 'Obligación Pedro' },
    { label: 'patrimonio neto', value: `s/ ${metricas.patrimonio.toLocaleString('en-US', {minimumFractionDigits: 2})}`, icon: PiggyBank, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Tu valor real' },
  ]
}