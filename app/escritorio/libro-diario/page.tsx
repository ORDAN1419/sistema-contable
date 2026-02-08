"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as Icons from 'lucide-react'
import { 
  Save, Loader2, CheckCircle2, 
  ArrowRightLeft, X, Search, Plus, Trash2, AlertTriangle, 
  Layout, Calculator, Calendar, Tag, ChevronRight, Sparkles, Hash, Coins
} from 'lucide-react'

interface FilaAsiento {
  codigo_cuenta: string;
  detalle_cuenta: string;
  debe: number;
  haber: number;
  tipo?: number;
}

const DynamicIcon = ({ name, color }: { name: string, color: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle
  return <IconComponent size={20} style={{ color }} />
}

export default function LibroDiarioPage() {
  const [loading, setLoading] = useState(false)
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [plantillaSel, setPlantillaSel] = useState<any>(null)
  const [glosa, setGlosa] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [filas, setFilas] = useState<FilaAsiento[]>([])
  const [proximoNumero, setProximoNumero] = useState(1) 
  
  // NUEVO: Estado para el monto real de la operación
  const [montoOperacion, setMontoOperacion] = useState<number>(0)

  const [showAccountSearch, setShowAccountSearch] = useState(false)
  const [busquedaCuenta, setBusquedaCuenta] = useState('')
  const [cuentasFiltradas, setCuentasFiltradas] = useState<any[]>([])

  const [showSlider, setShowSlider] = useState(false)
  const [busquedaPlantilla, setBusquedaPlantilla] = useState('')
  const [showMontoModal, setShowMontoModal] = useState(false)
  const [montoRapido, setMontoRapido] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const totalDebe = filas.reduce((acc, f) => acc + Number(f.debe), 0)
  const totalHaber = filas.reduce((acc, f) => acc + Number(f.haber), 0)
  const estaDescuadrado = Math.abs(totalDebe - totalHaber) > 0.01 
  const diferencia = Math.abs(totalDebe - totalHaber)

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  useEffect(() => {
    const filtrarCuentas = async () => {
      if (busquedaCuenta.length < 2) { setCuentasFiltradas([]); return; }
      const { data } = await supabase.from('mis_cuentas').select('*').eq('es_registro', true)
        .or(`nombre.ilike.%${busquedaCuenta}%,codigo.ilike.%${busquedaCuenta}%`).limit(10);
      if (data) setCuentasFiltradas(data);
    }
    filtrarCuentas();
  }, [busquedaCuenta])

  const cargarDatosIniciales = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: pData } = await supabase
      .from('plantillas')
      .select('*, categorias_contables(nombre, icono, color_hex)')
      .eq('user_id', user.id)
    if (pData) setPlantillas(pData)

    const { data: aData } = await supabase
      .from('asientos')
      .select('numero_asiento')
      .eq('user_id', user.id)
      .order('numero_asiento', { ascending: false })
      .limit(1)
    
    if (aData && aData.length > 0) {
      setProximoNumero(aData[0].numero_asiento + 1)
    }
  }

  const agregarFilaManual = (cuenta: any) => {
    setFilas([...filas, { codigo_cuenta: cuenta.codigo, detalle_cuenta: cuenta.nombre, debe: 0, haber: 0, tipo: cuenta.tipo }])
    setShowAccountSearch(false); setBusquedaCuenta('');
  }

  const seleccionarPlantilla = (p: any) => { setPlantillaSel(p); setShowSlider(false); setShowMontoModal(true); }

  const procesarMontoRapido = () => {
    const valor = Number(montoRapido)
    if (isNaN(valor)) return
    
    // GUARDAMOS EL MONTO REAL AQUÍ
    setMontoOperacion(valor)
    
    setGlosa(plantillaSel.nombre_plantilla)
    const estructura = plantillaSel.estructura.map((e: any, index: number) => ({
      codigo_cuenta: e.codigo_cuenta,
      detalle_cuenta: e.detalle_cuenta,
      debe: e.debe_fijo ? e.debe_fijo : (index % 2 === 0 ? valor : 0),
      haber: e.haber_fijo ? e.haber_fijo : (index % 2 === 0 ? 0 : valor),
      tipo: e.tipo 
    }))
    setFilas(estructura); setShowMontoModal(false); setMontoRapido('');
  }

  const guardarAsiento = async () => {
    if (estaDescuadrado || totalDebe === 0) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // MODIFICADO: Usamos montoOperacion si existe, de lo contrario un cálculo contable básico
    const montoAGuardar = montoOperacion > 0 ? montoOperacion : totalDebe;

    const { data: asiento, error: errorAsiento } = await supabase.from('asientos').insert({
      glosa, 
      fecha, 
      plantilla_id: plantillaSel?.id || null, 
      total_monto: montoAGuardar, // <--- VALOR REAL CORREGIDO
      user_id: user.id, 
      numero_asiento: proximoNumero
    }).select().single()

    if (!errorAsiento && asiento) {
      const apuntes = filas.map(f => ({ asiento_id: asiento.id, cuenta_codigo: f.codigo_cuenta, debe: f.debe, haber: f.haber, user_id: user.id }))
      const { error: errorApuntes } = await supabase.from('apuntes').insert(apuntes)
      if (!errorApuntes) {
        await supabase.rpc('actualizar_balance_comprobacion')
        setShowSuccess(true); setProximoNumero(prev => prev + 1)
        setTimeout(() => { 
          setShowSuccess(false); 
          setPlantillaSel(null); 
          setFilas([]); 
          setGlosa(''); 
          setMontoOperacion(0); // Reset monto
        }, 2000)
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-900">
      
      {showSuccess && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl text-center border border-slate-100 animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
            <h2 className="text-2xl font-black italic lowercase">asiento #00{proximoNumero - 1} guardado</h2>
          </div>
        </div>
      )}

      {showAccountSearch && (
        <div className="fixed inset-0 z-[850] flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
            <div className="p-6 border-b flex items-center gap-4">
              <Search className="text-slate-400" size={20} />
              <input autoFocus placeholder="buscar cuenta..." className="w-full outline-none font-bold text-sm lowercase" value={busquedaCuenta} onChange={(e) => setBusquedaCuenta(e.target.value)} />
              <button onClick={() => setShowAccountSearch(false)}><X size={20}/></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {cuentasFiltradas.map(c => (
                <div key={c.id} onClick={() => agregarFilaManual(c)} className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 transition-colors">
                  <div className="flex flex-col"><span className="text-[10px] font-black text-indigo-500 font-mono">{c.codigo}</span><span className="text-sm font-bold text-slate-700 lowercase italic">{c.nombre}</span></div>
                  <Plus size={14} className="text-slate-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest"><Sparkles size={14} /> jerarquía de movimientos</div>
          <h1 className="text-5xl font-black tracking-tighter italic lowercase">Asiento contable</h1>
        </div>
        <div className="flex bg-white p-2 rounded-3xl shadow-xl border border-slate-100 gap-2">
          <button onClick={() => setShowAccountSearch(true)} className="flex items-center gap-2 px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 hover:text-white transition-all"><Plus size={16} /> agregar fila</button>
          <button onClick={() => setShowSlider(true)} className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-lg"><Layout size={16} /> plantillas</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 sticky top-10">
            <div className="space-y-6">
              
              {/* NUEVA CAJA DE MONTO REAL */}
              <div className="space-y-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <label className="text-[10px] font-black text-indigo-400 uppercase ml-2 flex items-center gap-2 italic">
                  <Coins size={12}/> Monto de la Operación
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-indigo-600 text-lg italic">S/</span>
                  <input 
                    type="number" 
                    value={montoOperacion === 0 ? '' : montoOperacion} 
                    onChange={e => setMontoOperacion(Number(e.target.value))} 
                    placeholder="0.00" 
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-black text-indigo-600 text-xl transition-all shadow-inner" 
                  />
                </div>
                <p className="text-[9px] text-indigo-300 font-bold px-2 italic uppercase">Este es el valor que se guardará en el historial.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase italic">Glosa u Operación</label>
                <textarea value={glosa} onChange={e => setGlosa(e.target.value)} placeholder="describa la operación..." className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm transition-all h-32 lowercase resize-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase italic">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none shadow-inner" />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6 pb-40">
          <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center"><h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Detalle de Cuentas — Asiento Nº {proximoNumero}</h2></div>
            <div className="p-2 space-y-2">
              {filas.map((f, i) => (
                <div key={i} className="group grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-3 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-indigo-100">
                  <div className="col-span-5 pl-4"><span className="text-[10px] font-black text-indigo-500 font-mono tracking-tighter">{f.codigo_cuenta}</span><p className="text-xs font-black text-slate-700 leading-tight lowercase italic">{f.detalle_cuenta}</p></div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-400">D</span>
                      <input 
                        type="number" 
                        value={f.debe === 0 ? '' : f.debe} 
                        onChange={e => {const n=[...filas]; n[i].debe= e.target.value === '' ? 0 : Number(e.target.value); setFilas(n)}} 
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-4 bg-white border border-slate-100 rounded-xl text-right font-black text-emerald-600 text-sm outline-none" 
                      />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-400">H</span>
                      <input 
                        type="number" 
                        value={f.haber === 0 ? '' : f.haber} 
                        onChange={e => {const n=[...filas]; n[i].haber= e.target.value === '' ? 0 : Number(e.target.value); setFilas(n)}} 
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-4 bg-white border border-slate-100 rounded-xl text-right font-black text-rose-600 text-sm outline-none" 
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center"><button onClick={() => {const n = filas.filter((_, idx) => idx !== i); setFilas(n)}} className="text-slate-200 hover:text-rose-500"><Trash2 size={16} /></button></div>
                </div>
              ))}
            </div>

            <div className={`p-8 mt-4 ${estaDescuadrado ? 'bg-rose-50/50' : 'bg-emerald-50/50'} flex justify-between items-center`}>
              <div className="flex gap-10">
                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Debe</p><p className={`text-2xl font-black italic ${estaDescuadrado ? 'text-rose-600' : 'text-emerald-700'}`}>s/ {totalDebe.toFixed(2)}</p></div>
                <div className="border-l pl-10"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Haber</p><p className={`text-2xl font-black italic ${estaDescuadrado ? 'text-rose-600' : 'text-rose-700'}`}>s/ {totalHaber.toFixed(2)}</p></div>
              </div>
              <div className="flex flex-col items-end gap-3">
                {estaDescuadrado && <div className="bg-white text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-rose-100 flex items-center gap-2"><AlertTriangle size={14} /> descuadre: s/ {diferencia.toFixed(2)}</div>}
                <button onClick={guardarAsiento} disabled={loading || estaDescuadrado || totalDebe === 0} className={`px-10 py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl transition-all ${estaDescuadrado || totalDebe === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-indigo-200'}`}>
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {estaDescuadrado ? 'revisar' : 'publicar asiento'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showSlider && (
        <div className="fixed inset-0 z-[800] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-10 animate-in slide-in-from-right flex flex-col border-l border-slate-100">
            <div className="flex justify-between items-center mb-10 pb-6 border-b">
              <div><h2 className="text-2xl font-black italic text-slate-900 tracking-tighter uppercase">Elegir Plantilla</h2><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Biblioteca rápida</p></div>
              <button onClick={() => setShowSlider(false)}><X size={24} /></button>
            </div>
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="buscar plantilla..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-xs transition-all lowercase" value={busquedaPlantilla} onChange={(e) => setBusquedaPlantilla(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {plantillas.filter(p => p.nombre_plantilla.toLowerCase().includes(busquedaPlantilla.toLowerCase())).map((p) => (
                <button key={p.id} onClick={() => seleccionarPlantilla(p)} className="group w-full bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl transition-all text-left relative overflow-hidden active:scale-95">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl" style={{ backgroundColor: `${p.categorias_contables?.color_hex}15` }}>
                        <DynamicIcon name={p.categorias_contables?.icono} color={p.categorias_contables?.color_hex} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase italic">{p.categorias_contables?.nombre || 'General'}</span>
                        <h3 className="text-lg font-black text-slate-800 lowercase italic leading-tight">{p.nombre_plantilla}</h3>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-full border border-slate-100 w-fit font-bold italic uppercase text-[9px]">
                    <Hash size={10} /><span>{p.estructura?.length || 0} movimientos</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMontoModal && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-lg animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center space-y-8 animate-in zoom-in relative">
            <button 
              onClick={() => setShowMontoModal(false)} 
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black italic tracking-tighter lowercase">{plantillaSel?.nombre_plantilla}</h2>
            
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-500 italic">S/</span>
              <input 
                autoFocus 
                type="number" 
                value={montoRapido === '0' || Number(montoRapido) === 0 ? '' : montoRapido} 
                onChange={(e) => setMontoRapido(e.target.value)} 
                placeholder="0.00"
                className="w-full pl-16 pr-8 py-8 bg-slate-50 rounded-3xl text-5xl font-black outline-none border-4 border-transparent focus:border-indigo-500 shadow-inner" 
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowMontoModal(false)} 
                className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all italic"
              >
                cancelar
              </button>
              <button 
                onClick={procesarMontoRapido} 
                className="flex-[2] py-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 active:scale-95 italic"
              >
                aplicar monto
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}