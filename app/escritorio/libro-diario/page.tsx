"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Save, Loader2, CheckCircle2, 
  ArrowRightLeft, X, Search, Plus, Trash2, AlertTriangle, Hash, Calculator,
  Layout 
} from 'lucide-react'

interface FilaAsiento {
  codigo_cuenta: string;
  detalle_cuenta: string;
  debe: number;
  haber: number;
  tipo?: number;
}

export default function LibroDiarioPage() {
  const [loading, setLoading] = useState(false)
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [plantillaSel, setPlantillaSel] = useState<any>(null)
  const [glosa, setGlosa] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [filas, setFilas] = useState<FilaAsiento[]>([])
  const [proximoNumero, setProximoNumero] = useState(1) 
  
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
      if (busquedaCuenta.length < 2) {
        setCuentasFiltradas([]);
        return;
      }
      const { data } = await supabase
        .from('mis_cuentas')
        .select('*')
        .eq('es_registro', true)
        .or(`nombre.ilike.%${busquedaCuenta}%,codigo.ilike.%${busquedaCuenta}%`)
        .limit(10);
      if (data) setCuentasFiltradas(data);
    }
    filtrarCuentas();
  }, [busquedaCuenta])

  const cargarDatosIniciales = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: pData } = await supabase.from('plantillas').select('*').eq('user_id', user.id)
    if (pData) setPlantillas(pData)
    const { data: aData } = await supabase.from('asientos').select('numero_asiento').eq('user_id', user.id).order('numero_asiento', { ascending: false }).limit(1)
    if (aData && aData.length > 0) { setProximoNumero(aData[0].numero_asiento + 1) } else { setProximoNumero(1) }
  }

  const agregarFilaManual = (cuenta: any) => {
    const nuevaFila: FilaAsiento = {
      codigo_cuenta: cuenta.codigo,
      detalle_cuenta: cuenta.nombre,
      debe: 0,
      haber: 0,
      tipo: cuenta.tipo
    }
    setFilas([...filas, nuevaFila])
    setShowAccountSearch(false)
    setBusquedaCuenta('')
  }

  const eliminarFila = (index: number) => {
    const nuevas = filas.filter((_, i) => i !== index)
    setFilas(nuevas)
  }

  const seleccionarPlantilla = (p: any) => {
    setPlantillaSel(p)
    setShowSlider(false)
    setShowMontoModal(true)
  }

  const procesarMontoRapido = () => {
    const valor = Number(montoRapido)
    setGlosa(plantillaSel.nombre_plantilla)
    const estructura = plantillaSel.estructura.map((e: any, index: number) => ({
      codigo_cuenta: e.codigo_cuenta,
      detalle_cuenta: e.detalle_cuenta,
      debe: e.debe_fijo ? e.debe_fijo : (index % 2 === 0 ? valor : 0),
      haber: e.haber_fijo ? e.haber_fijo : (index % 2 === 0 ? 0 : valor),
      tipo: e.tipo 
    }))
    setFilas(estructura)
    setShowMontoModal(false)
    setMontoRapido('')
  }

  const guardarAsiento = async () => {
    if (estaDescuadrado || totalDebe === 0) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    /**
     * CORRECCIÓN DE MONTO:
     * El monto del asiento es el total de una de sus columnas (Debe).
     * Eliminamos la división entre 2 que causaba el error de 2260.75.
     */
    const montoCalculado = totalDebe; 

    const { data: asiento, error: errorAsiento } = await supabase.from('asientos').insert({
      glosa, 
      fecha, 
      plantilla_id: plantillaSel?.id || null, 
      total_monto: montoCalculado, // Guardará el valor real (ej: 4521.50)
      user_id: user?.id, 
      numero_asiento: proximoNumero
    }).select().single()

    if (!errorAsiento && asiento) {
      const apuntes = filas.map(f => ({
        asiento_id: asiento.id, 
        cuenta_codigo: f.codigo_cuenta, 
        debe: f.debe, 
        haber: f.haber, 
        user_id: user?.id
      }))
      
      const { error: errorApuntes } = await supabase.from('apuntes').insert(apuntes)
      
      if (!errorApuntes) {
        await supabase.rpc('actualizar_balance_comprobacion')
        setShowSuccess(true)
        setProximoNumero(prev => prev + 1)
        setTimeout(() => { 
          setShowSuccess(false)
          setPlantillaSel(null)
          setFilas([])
          setGlosa('')
        }, 2000)
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 font-sans tracking-tight text-slate-900">
      
      {/* MODAL ÉXITO */}
      {showSuccess && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-900/30 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl text-center border border-slate-100 animate-in zoom-in">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 lowercase italic">¡asiento registrado!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">jerarquía y balance actualizados</p>
          </div>
        </div>
      )}

      {/* BUSCADOR DE CUENTAS */}
      {showAccountSearch && (
        <div className="fixed inset-0 z-[850] flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <Search className="text-slate-400" size={20} />
              <input 
                autoFocus
                placeholder="buscar cuenta (yape, bcp, alimentación...)"
                className="w-full outline-none font-bold text-sm lowercase"
                value={busquedaCuenta}
                onChange={(e) => setBusquedaCuenta(e.target.value)}
              />
              <button onClick={() => setShowAccountSearch(false)}><X size={20}/></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {cuentasFiltradas.map(c => (
                <div key={c.id} onClick={() => agregarFilaManual(c)} className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-indigo-500 font-mono">{c.codigo}</span>
                    <span className="text-sm font-bold text-slate-700 lowercase italic">{c.nombre}</span>
                  </div>
                  <Plus size={14} className="text-slate-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-500 mb-1">
            <ArrowRightLeft size={18} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] lowercase">gestión multinivel</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter lowercase italic">libro diario</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAccountSearch(true)} className="flex items-center gap-3 px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-[10px] lowercase italic hover:bg-indigo-100 transition-all">
            <Plus size={16} /> agregar fila
          </button>
          <button onClick={() => setShowSlider(true)} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] lowercase italic shadow-xl hover:bg-indigo-600 transition-all">
            <Layout size={16} /> plantillas
          </button>
        </div>
      </header>

      {/* FORMULARIO DE ASIENTO */}
      {(filas.length > 0 || glosa) && (
        <div className="mt-12 space-y-8 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block italic">glosa del asiento</label>
              <input value={glosa} onChange={e => setGlosa(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none shadow-sm focus:border-indigo-500 transition-all lowercase" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block italic">fecha de operación</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none shadow-sm" />
            </div>
          </div>

          <div className={`bg-white rounded-[2.5rem] border overflow-hidden transition-all ${estaDescuadrado ? 'border-rose-200 shadow-rose-100 shadow-2xl' : 'border-slate-100 shadow-sm'}`}>
            <table className="w-full">
              <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <tr className="text-[10px] font-black uppercase tracking-widest">
                  <th className="p-6 text-left">cuenta contable</th>
                  <th className="p-6 text-center w-40">debe</th>
                  <th className="p-6 text-center w-40">haber</th>
                  <th className="p-6 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map((f, i) => (
                  <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-500 font-mono mb-1">{f.codigo_cuenta}</span>
                        <span className="text-sm font-bold text-slate-700 lowercase italic">{f.detalle_cuenta}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={f.debe} 
                        onChange={e => {const n=[...filas]; n[i].debe=Number(e.target.value); setFilas(n)}} 
                        className="w-full p-4 bg-slate-50 rounded-xl text-right font-black text-emerald-600 text-lg outline-none focus:bg-white transition-all" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={f.haber} 
                        onChange={e => {const n=[...filas]; n[i].haber=Number(e.target.value); setFilas(n)}} 
                        className="w-full p-4 bg-slate-50 rounded-xl text-right font-black text-rose-600 text-lg outline-none focus:bg-white transition-all" 
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => eliminarFila(i)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* BARRA DE TOTALES */}
            <div className={`p-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t ${estaDescuadrado ? 'bg-rose-50/30' : 'bg-slate-50/30'}`}>
              <div className="flex gap-12">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">total debe</p>
                  <p className={`text-3xl font-black italic ${estaDescuadrado ? 'text-rose-500' : 'text-emerald-600'}`}>s/ {totalDebe.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">total haber</p>
                  <p className={`text-3xl font-black italic ${estaDescuadrado ? 'text-rose-500' : 'text-rose-600'}`}>s/ {totalHaber.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-4">
                {estaDescuadrado && (
                  <div className="flex items-center gap-2 bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-bold animate-pulse">
                    <AlertTriangle size={14} /> descuadre: s/ {diferencia.toFixed(2)}
                  </div>
                )}
                <button 
                  onClick={guardarAsiento} 
                  disabled={loading || estaDescuadrado || totalDebe === 0}
                  className={`px-12 py-5 rounded-2xl font-black uppercase tracking-tighter text-[11px] shadow-xl transition-all flex items-center gap-3 ${
                    estaDescuadrado || totalDebe === 0 
                    ? 'bg-slate-200 text-slate-400 shadow-none' 
                    : 'bg-slate-900 text-white hover:bg-indigo-600'
                  }`}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {estaDescuadrado ? 'revisar montos' : 'procesar asiento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDER PLANTILLAS */}
      {showSlider && (
        <div className="fixed inset-0 z-[800] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 animate-in slide-in-from-right flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold italic lowercase">elegir plantilla</h2>
              <button onClick={() => setShowSlider(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {plantillas.filter(p => p.nombre_plantilla.toLowerCase().includes(busquedaPlantilla.toLowerCase())).map((p) => (
                <div key={p.id} onClick={() => seleccionarPlantilla(p)} className="p-5 bg-white hover:bg-indigo-50 rounded-2xl border border-slate-100 cursor-pointer shadow-sm">
                  <p className="text-xs font-bold text-slate-700 lowercase italic">{p.nombre_plantilla}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MONTO RÁPIDO */}
      {showMontoModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl animate-in zoom-in border border-slate-100">
            <div className="flex flex-col gap-6 text-center">
              <h2 className="text-2xl font-bold lowercase italic">{plantillaSel?.nombre_plantilla}</h2>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-indigo-500">s/</span>
                <input autoFocus type="number" value={montoRapido} onChange={(e) => setMontoRapido(e.target.value)} className="w-full pl-16 pr-6 py-6 bg-slate-50 rounded-2xl text-4xl font-bold outline-none" />
              </div>
              <button onClick={procesarMontoRapido} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all">aplicar monto</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}