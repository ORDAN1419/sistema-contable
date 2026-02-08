"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as Icons from 'lucide-react'
import { 
  Trash2, Search, Save, Settings2, Plus, 
  CheckCircle2, AlertCircle, X, HelpCircle, BookOpen, Zap, Loader2, 
  PlusCircle, ArrowRightCircle, ChevronRight, ChevronDown, Folder, FolderOpen,
  Layout, Edit3, Trash, Layers, Archive, Activity
} from 'lucide-react'

/**
 * Componente dinámico para renderizar iconos de categorías
 */
const DynamicIcon = ({ name, color }: { name: string, color: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle
  return <IconComponent size={20} style={{ color }} />
}

export default function GestorPlantillas() {
  // --- ESTADOS DE CARGA Y DATOS ---
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<any[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState<any>(null)
  
  // --- ESTADOS DE LA PLANTILLA EN DISEÑO ---
  const [conceptoPlantilla, setConceptoPlantilla] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [plantillaEnEdicion, setPlantillaEnEdicion] = useState<string | null>(null)

  // --- ESTADOS DE GESTIÓN DE PLANTILLAS GUARDADAS ---
  const [showSavedTemplates, setShowSavedTemplates] = useState(false)
  const [plantillasGuardadas, setPlantillasGuardadas] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // --- ESTADOS DEL BUSCADOR INTERNO POR FILA ---
  const [sugerencias, setSugerencias] = useState<any[]>([])
  const [filaActiva, setFilaActiva] = useState<number | null>(null)
  const [textoBusqueda, setTextoBusqueda] = useState<{ [key: number]: string }>({})

  // --- ESTADOS DEL ASISTENTE JERÁRQUICO (PANEL LATERAL) ---
  const [showMisCuentas, setShowMisCuentas] = useState(false)
  const [listaMisCuentas, setListaMisCuentas] = useState<any[]>([])
  const [busquedaInterna, setBusquedaInterna] = useState('')
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})

  // --- ESTADOS PARA CREACIÓN RÁPIDA DE CUENTA DESDE ASISTENTE ---
  const [showCrearCuenta, setShowCrearCuenta] = useState(false)
  const [nuevaCuenta, setNuevaCuenta] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    padre_codigo: '',
    es_registro: true
  })

  // --- FILAS DE LA ESTRUCTURA MULTINIVEL ---
  const [filas, setFilas] = useState<any[]>([
    { codigo_cuenta: '', detalle_cuenta: '', tipo: null },
    { codigo_cuenta: '', detalle_cuenta: '', tipo: null }
  ])

  // --- CARGA INICIAL ---
  useEffect(() => {
    fetchCategorias()
  }, [])

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias_contables').select('*').order('nombre')
    if (data) {
      setCategorias(data)
      if (data.length > 0) setCategoriaSeleccionada(data[0].id)
    }
  }

  const fetchPlantillas = async () => {
    setLoadingTemplates(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('plantillas')
        .select('*, categorias_contables(nombre, icono, color_hex)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) setPlantillasGuardadas(data)
    } catch (err) {
      console.error("Error al cargar plantillas:", err)
    } finally {
      setLoadingTemplates(false)
      setShowSavedTemplates(true)
    }
  }

  const cargarPlantillaParaEditar = (plantilla: any) => {
    setPlantillaEnEdicion(plantilla.id)
    setConceptoPlantilla(plantilla.nombre_plantilla)
    setCategoriaSeleccionada(plantilla.categoria_id)
    const estructura = plantilla.estructura || []
    setFilas(estructura)
    const nuevoTexto: any = {}
    estructura.forEach((f: any, i: number) => {
      if (f.codigo_cuenta) nuevoTexto[i] = `${f.codigo_cuenta} - ${f.detalle_cuenta}`
    })
    setTextoBusqueda(nuevoTexto)
    setShowSavedTemplates(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminarPlantilla = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('plantillas').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
      setPlantillasGuardadas(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      console.error("Error al borrar:", err.message)
      alert("No se pudo eliminar la plantilla.")
    }
  }

  const abrirMisCuentas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('mis_cuentas').select('*').eq('user_id', user.id).order('codigo')
    if (data) setListaMisCuentas(data)
    setShowMisCuentas(true)
  }

  const toggleExpandir = (codigo: string) => {
    setExpandidos(prev => ({ ...prev, [codigo]: !prev[codigo] }))
  }

  const toggleEstadoRegistroAsistente = async (cuenta: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nuevoEstado = !cuenta.es_registro
    const { error } = await supabase.from('mis_cuentas').update({ es_registro: nuevoEstado }).eq('id', cuenta.id).eq('user_id', user.id)
    if (!error) abrirMisCuentas()
  }

  const prepararNuevaCuentaAsistente = (padre: any) => {
    const hijos = listaMisCuentas.filter(c => c.padre_codigo === padre.codigo)
    let sugerido = ""
    if (padre.codigo.length === 3) {
      let correlativo = 1;
      if (hijos.length > 0) {
        const ultimos = hijos.map(h => parseInt(h.codigo.slice(-2)));
        correlativo = Math.max(...ultimos.filter(n => !isNaN(n))) + 1;
      }
      sugerido = `${padre.codigo}${correlativo.toString().padStart(2, '0')}`
    } else {
      sugerido = `${padre.codigo}${hijos.length + 1}`
    }
    setNuevaCuenta({ codigo: sugerido, nombre: '', descripcion: '', padre_codigo: padre.codigo, es_registro: true })
    setShowCrearCuenta(true)
  }

  /**
   * CORRECCIÓN: Lógica de Niveles y Tipo Letra
   */
  const guardarNuevaAsistente = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !nuevaCuenta.nombre) return

    // 1. Cálculo de Nivel según tu lógica:
    // 2 dígitos (10) -> Nivel 1
    // 3 dígitos (104) -> Nivel 2
    // 5 dígitos (10411) -> Nivel 3
    // 6+ dígitos (104111) -> Nivel 4
    let nivelCalculado = 1;
    const len = nuevaCuenta.codigo.length;
    if (len === 2) nivelCalculado = 1;
    else if (len === 3) nivelCalculado = 2;
    else if (len === 5) nivelCalculado = 3;
    else if (len >= 6) nivelCalculado = 4;

    // 2. Determinación de Naturaleza Contable (tipo_letra)
    const primerDigito = nuevaCuenta.codigo[0];
    const mapeoNaturaleza: Record<string, string> = {
      '1': 'activo',
      '2': 'activo',
      '3': 'activo',
      '4': 'pasivo',
      '5': 'patrimonio',
      '6': 'gasto (nat)',
      '7': 'ingreso',
      '8': 'gasto (fun)',
      '9': 'gasto (fun)'
    };
    const tipoLetra = mapeoNaturaleza[primerDigito] || 'OTRO';

    const { error } = await supabase.from('mis_cuentas').insert([{
      codigo: nuevaCuenta.codigo,
      nombre: nuevaCuenta.nombre.toLowerCase(),
      descripcion: nuevaCuenta.descripcion.toLowerCase(),
      padre_codigo: nuevaCuenta.padre_codigo,
      es_registro: nuevaCuenta.es_registro,
      user_id: user.id,
      nivel: nivelCalculado,
      tipo_letra: tipoLetra,
      tipo: (primerDigito === '1' || primerDigito === '2' || primerDigito === '3') ? 1 : 2
    }])

    if (!error) {
      if (nuevaCuenta.padre_codigo) {
        await supabase.from('mis_cuentas').update({ es_registro: false }).eq('codigo', nuevaCuenta.padre_codigo).eq('user_id', user.id)
      }
      setShowCrearCuenta(false)
      abrirMisCuentas()
    } else {
      alert("Error: " + error.message)
    }
  }

  const insertarCuentaDesdePanel = (cuenta: any) => {
    if (!cuenta.es_registro) return 
    const nf = [...filas]
    const idx = nf.findIndex(f => !f.codigo_cuenta)
    if (idx !== -1) {
      nf[idx] = { codigo_cuenta: cuenta.codigo, detalle_cuenta: cuenta.nombre, tipo: cuenta.tipo }
      setTextoBusqueda({ ...textoBusqueda, [idx]: `${cuenta.codigo} - ${cuenta.nombre}` })
    } else {
      nf.push({ codigo_cuenta: cuenta.codigo, detalle_cuenta: cuenta.nombre, tipo: cuenta.tipo })
      setTextoBusqueda({ ...textoBusqueda, [nf.length - 1]: `${cuenta.codigo} - ${cuenta.nombre}` })
    }
    setFilas(nf)
  }

  const limpiarContenidoFila = (index: number) => {
    const nf = [...filas]; nf[index] = { codigo_cuenta: '', detalle_cuenta: '', tipo: null }; setFilas(nf)
    const nt = { ...textoBusqueda }; delete nt[index]; setTextoBusqueda(nt)
  }

  const agregarNuevaFila = () => setFilas([...filas, { codigo_cuenta: '', detalle_cuenta: '', tipo: null }])
  const eliminarFilaCompleta = (index: number) => {
    if (filas.length <= 1) return
    setFilas(filas.filter((_, i) => i !== index))
    const nt = { ...textoBusqueda }; delete nt[index]; setTextoBusqueda(nt)
  }

  const buscarCuentas = async (query: string, index: number) => {
    setFilaActiva(index); setTextoBusqueda({ ...textoBusqueda, [index]: query })
    if (query.trim().length < 1) return setSugerencias([])
    const { data } = await supabase.from('mis_cuentas')
      .select('id, codigo, nombre, tipo')
      .eq('es_registro', true)
      .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`)
      .limit(6)
    setSugerencias(data || [])
  }

  const seleccionarCuenta = (cuenta: any, index: number) => {
    const nf = [...filas]
    nf[index] = { codigo_cuenta: cuenta.codigo, detalle_cuenta: cuenta.nombre, tipo: cuenta.tipo }
    setFilas(nf)
    setTextoBusqueda({ ...textoBusqueda, [index]: `${cuenta.codigo} - ${cuenta.nombre}` })
    setSugerencias([]); setFilaActiva(null)
  }

  const guardarPlantilla = async () => {
    if (!conceptoPlantilla || !categoriaSeleccionada) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const dp = {
      nombre_plantilla: conceptoPlantilla,
      concepto_heredado: conceptoPlantilla,
      categoria_id: categoriaSeleccionada,
      estructura: filas.filter(f => f.codigo_cuenta),
      user_id: user.id 
    }

    const { error } = plantillaEnEdicion 
      ? await supabase.from('plantillas').update(dp).eq('id', plantillaEnEdicion).eq('user_id', user.id)
      : await supabase.from('plantillas').insert([dp])

    if (!error) {
      setShowSuccessModal(true); setConceptoPlantilla(''); setPlantillaEnEdicion(null)
      setFilas([{ codigo_cuenta: '', detalle_cuenta: '', tipo: null }, { codigo_cuenta: '', detalle_cuenta: '', tipo: null }])
      setTextoBusqueda({}); setTimeout(() => setShowSuccessModal(false), 2000)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-4 md:p-10 font-sans tracking-tight text-slate-900">
      
      {showSuccessModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">¡Operación Exitosa!</h2>
          </div>
        </div>
      )}

      {showSavedTemplates && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200"><Archive size={24}/></div>
                <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Mis Plantillas</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Biblioteca Personal</p></div>
              </div>
              <button onClick={() => setShowSavedTemplates(false)} className="p-3 hover:bg-white rounded-full border shadow-sm transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#FCFCFC]">
              {loadingTemplates ? ( <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={40} /></div> ) : (
                plantillasGuardadas.map((p) => (
                  <div key={p.id} className="group bg-white rounded-[2rem] p-6 border-2 border-transparent hover:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl"><DynamicIcon name={p.categorias_contables?.icono} color={p.categorias_contables?.color_hex} /></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.categorias_contables?.nombre}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => cargarPlantillaParaEditar(p)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                        <button onClick={() => eliminarPlantilla(p.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash size={16}/></button>
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 lowercase mb-4 relative z-10">{p.nombre_plantilla}</h3>
                    <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase italic bg-indigo-50/50 w-fit px-3 py-1 rounded-full relative z-10">
                      <Activity size={10} /> {p.estructura?.length || 0} movimientos
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showMisCuentas && (
        <div className="fixed inset-0 z-[300] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-100">
            <div className="flex justify-between items-center mb-8 pb-6 border-b">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Plan Maestro</h2>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Asistente de Inserción</p>
              </div>
              <button onClick={() => {setShowMisCuentas(false); setShowCrearCuenta(false)}} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>

            {!showCrearCuenta && (
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Filtrar plan de cuentas..." onChange={(e) => setBusquedaInterna(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-xs transition-all lowercase" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {showCrearCuenta ? (
                <div className="p-6 bg-indigo-50/50 rounded-[2.5rem] border-2 border-indigo-100 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase text-indigo-600 tracking-widest italic">Nueva Subcuenta</h3>
                    <button onClick={() => setShowCrearCuenta(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Código</label>
                        <input value={nuevaCuenta.codigo} readOnly className="w-full p-4 bg-white border-2 border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 outline-none shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Estado</label>
                        <div className="p-4 bg-white border-2 border-transparent rounded-xl flex items-center gap-2 shadow-sm">
                           <input type="checkbox" checked={nuevaCuenta.es_registro} onChange={e => setNuevaCuenta({...nuevaCuenta, es_registro: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                           <span className="text-[9px] font-black uppercase">¿Registro?</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Nombre detalle</label>
                      <input autoFocus value={nuevaCuenta.nombre} onChange={e => setNuevaCuenta({...nuevaCuenta, nombre: e.target.value})} placeholder="Ej: Scotiabank Soles" className="w-full p-4 bg-white border-2 border-transparent focus:border-indigo-500 rounded-xl text-xs font-bold outline-none lowercase shadow-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2 italic">Descripción adicional</label>
                      <textarea value={nuevaCuenta.descripcion} onChange={e => setNuevaCuenta({...nuevaCuenta, descripcion: e.target.value})} className="w-full p-4 bg-white border-2 border-transparent focus:border-indigo-500 rounded-xl text-xs font-bold outline-none h-24 lowercase resize-none shadow-sm" />
                    </div>
                    <button onClick={guardarNuevaAsistente} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 italic">Guardar e Insertar</button>
                  </div>
                </div>
              ) : (
                listaMisCuentas
                .filter(c => (busquedaInterna.length > 0 || c.nivel === 1 || expandidos[c.padre_codigo || '']) && (c.nombre.toLowerCase().includes(busquedaInterna.toLowerCase()) || c.codigo.includes(busquedaInterna)))
                .map((cuenta) => {
                  const estaAbierto = expandidos[cuenta.codigo];
                  return (
                    <div key={cuenta.id} style={{ marginLeft: `${(cuenta.nivel - 1) * 16}px` }}
                      className={`group p-3 rounded-xl border-2 transition-all flex items-center justify-between ${cuenta.es_registro 
                        ? 'bg-white border-slate-50 hover:border-indigo-200 cursor-pointer shadow-sm' : 'bg-slate-50/40 border-transparent opacity-80'}`}>
                      <div className="flex items-center gap-3">
                        {!cuenta.es_registro && (
                          <button onClick={() => toggleExpandir(cuenta.codigo)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                            {estaAbierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             {!cuenta.es_registro ? (estaAbierto ? <FolderOpen size={12} className="text-indigo-400" /> : <Folder size={12} className="text-slate-300" />) : <Zap size={10} className="text-indigo-500 fill-current" />}
                             <span className={`text-[10px] font-black uppercase ${cuenta.es_registro ? 'text-slate-700' : 'text-slate-400'}`}>{cuenta.nombre}</span>
                          </div>
                          <span className="text-[9px] font-mono text-indigo-400 font-bold ml-5">{cuenta.codigo}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleEstadoRegistroAsistente(cuenta)} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${cuenta.es_registro ? 'text-indigo-400 bg-indigo-50 hover:bg-indigo-600 hover:text-white' : 'text-slate-400 bg-slate-100 hover:bg-slate-900 hover:text-white'}`}>
                          <Settings2 size={12}/>
                        </button>
                        {!cuenta.es_registro && (
                          <button onClick={() => prepararNuevaCuentaAsistente(cuenta)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white shadow-sm">
                            <Plus size={14} />
                          </button>
                        )}
                        {cuenta.es_registro && (
                          <button onClick={() => insertarCuentaDesdePanel(cuenta)} className="p-2 bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90">
                            <ArrowRightCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest"><Settings2 size={18} /> Setup Inteligente</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Diseñador de Plantillas</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPlantillas} className="flex items-center gap-2 px-6 py-4 bg-slate-100 border-2 border-transparent rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-all shadow-sm">
              <Archive size={16} /> Mis Plantillas
            </button>
            <button onClick={abrirMisCuentas} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl border-2 ${showMisCuentas ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-500'}`}><BookOpen size={16} /> Asistente</button>
            <button onClick={guardarPlantilla} disabled={loading || !conceptoPlantilla} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${!loading && conceptoPlantilla ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-slate-200 text-slate-400'}`}>{loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {plantillaEnEdicion ? "Actualizar" : "Publicar"}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 sticky top-10">
              <div className="flex items-center gap-3 mb-8"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">01</div><h2 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Cabecera</h2></div>
              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">operación</label>
                <input type="text" value={conceptoPlantilla} onChange={(e) => setConceptoPlantilla(e.target.value)} placeholder="Ej: Pago de Tributos" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 transition-all lowercase shadow-inner" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest italic">Categoría</label>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-80 pr-2 custom-scrollbar">
                  {categorias.map((cat) => (
                    <button key={cat.id} onClick={() => setCategoriaSeleccionada(cat.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${categoriaSeleccionada === cat.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'}`}>
                      <div className="flex items-center gap-3"><DynamicIcon name={cat.icono} color={cat.color_hex} /><span className={`text-[10px] font-black uppercase ${categoriaSeleccionada === cat.id ? 'text-indigo-700' : 'text-slate-500'}`}>{cat.nombre}</span></div>
                      <HelpCircle size={14} className="text-slate-300 hover:text-indigo-500" onClick={(e) => { e.stopPropagation(); setShowHelp(cat); }} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xs italic">02</div><h2 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Estructura</h2></div>
                <button onClick={agregarNuevaFila} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-100 transition-all active:scale-95"><Plus size={14} className="inline mr-1"/> Añadir</button>
              </div>

              <div className="space-y-3 flex-1">
                {filas.map((f, i) => (
                  <div key={i} className="group grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all shadow-sm">
                    <div className="col-span-1 text-[10px] font-black text-slate-300 text-center italic">{i + 1}</div>
                    <div className="col-span-10 relative flex items-center bg-white rounded-xl pr-2 border border-slate-100 group-hover:border-indigo-100 transition-colors shadow-inner">
                      <input className="w-full p-4 bg-transparent font-bold text-xs outline-none text-slate-600 lowercase" placeholder="Usar asistente o buscar..." value={textoBusqueda[i] || ''} onChange={(e) => buscarCuentas(e.target.value, i)} />
                      {textoBusqueda[i] && <button onClick={() => limpiarContenidoFila(i)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><X size={16} /></button>}
                      {filaActiva === i && sugerencias.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 ring-1 ring-black/5">
                          {sugerencias.map((s) => (
                            <div key={s.id || s.codigo} onClick={() => seleccionarCuenta(s, i)} className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors">
                              <span className="text-[11px] font-bold text-slate-700 italic lowercase">{s.nombre}</span>
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">{s.codigo}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => eliminarFilaCompleta(i)} className="col-span-1 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              <div className={`mt-8 p-6 rounded-[2rem] border-2 border-dashed transition-all duration-500 flex items-start gap-4 ${filas.length % 2 === 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                <div className={`p-2.5 rounded-xl shadow-sm ${filas.length % 2 === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}><CheckCircle2 className="text-white" size={20} /></div>
                <div className="space-y-1">
                  <p className={`text-[11px] font-black uppercase tracking-widest ${filas.length % 2 === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>Partida Doble</p>
                  <p className="text-[10px] text-slate-600 font-medium leading-tight italic lowercase">{filas.length % 2 === 0 ? "Estructura cuadrada" : "Número impar"}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {showHelp && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 text-center border border-slate-100">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><DynamicIcon name={showHelp.icono} color={showHelp.color_hex} /></div>
            <h3 className="font-black text-slate-800 uppercase italic tracking-tighter mb-2">Guía: {showHelp.nombre}</h3>
            <p className="text-slate-500 text-xs italic leading-relaxed mb-8">{showHelp.descripcion_larga || "Categoría estándar."}</p>
            <button onClick={() => setShowHelp(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">Cerrar</button>
          </div>
        </div>
      )}
    </main>
  )
}