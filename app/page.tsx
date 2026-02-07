"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as Icons from 'lucide-react'
import { 
  Trash2, Search, LayoutTemplate, Save, ListPlus, 
  Sparkles, ChevronRight, HelpCircle, X, Bookmark,
  Layers, Settings2, Plus, CheckCircle2, AlertCircle 
} from 'lucide-react'

// Componente para iconos dinámicos de Supabase
const DynamicIcon = ({ name, color }: { name: string, color: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle
  return <IconComponent size={20} style={{ color }} />
}

export default function GestorPlantillas() {
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<any[]>([])
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState<any>(null)
  const [conceptoPlantilla, setConceptoPlantilla] = useState('')
  const [sugerencias, setSugerencias] = useState<any[]>([])
  const [filaActiva, setFilaActiva] = useState<number | null>(null)
  const [textoBusqueda, setTextoBusqueda] = useState<{ [key: number]: string }>({})

  // MODIFICADO: Ahora inicia con solo 2 filas (Deudor y Acreedor)
  const [filas, setFilas] = useState([
    { codigo_cuenta: '', detalle_cuenta: '' },
    { codigo_cuenta: '', detalle_cuenta: '' }
  ])

  // Cargar categorías desde la base de datos
  useEffect(() => {
    const fetchCategorias = async () => {
      const { data } = await supabase.from('categorias_contables').select('*').order('nombre')
      if (data) {
        setCategorias(data)
        setCategoriaSeleccionada(data[0]?.id)
      }
    }
    fetchCategorias()
  }, [])

  const agregarNuevaFila = () => setFilas([...filas, { codigo_cuenta: '', detalle_cuenta: '' }])
  
  const eliminarFila = (index: number) => {
    if (filas.length <= 1) return
    setFilas(filas.filter((_, i) => i !== index))
    const nuevoTexto = { ...textoBusqueda }; delete nuevoTexto[index]; setTextoBusqueda(nuevoTexto)
  }

  const buscarCuentas = async (query: string, index: number) => {
    setFilaActiva(index)
    setTextoBusqueda({ ...textoBusqueda, [index]: query })
    if (query.trim().length < 1) return setSugerencias([])
    const { data } = await supabase.from('plan_contable').select('codigo, nombre')
      .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%`).limit(6)
    setSugerencias(data || [])
  }

  const seleccionarCuenta = (cuenta: any, index: number) => {
    const nuevasFilas = [...filas]
    nuevasFilas[index] = { codigo_cuenta: cuenta.codigo, detalle_cuenta: cuenta.nombre }
    setFilas(nuevasFilas)
    setTextoBusqueda({ ...textoBusqueda, [index]: `${cuenta.codigo} - ${cuenta.nombre}` })
    setSugerencias([]); setFilaActiva(null)
  }

  const guardarPlantilla = async () => {
    if (!conceptoPlantilla || !categoriaSeleccionada) return alert("Completa el nombre y categoría")
    setLoading(true)
    const { error } = await supabase.from('plantillas').insert({
      nombre_plantilla: conceptoPlantilla,
      concepto_heredado: conceptoPlantilla,
      categoria_id: categoriaSeleccionada,
      estructura: filas 
    })

    if (error) alert("Error al guardar: " + error.message)
    else {
      alert("✨ ¡Plantilla publicada con éxito!")
      setConceptoPlantilla(''); 
      setFilas([{ codigo_cuenta: '', detalle_cuenta: '' }, { codigo_cuenta: '', detalle_cuenta: '' }]); // Reset a 2 filas
      setTextoBusqueda({});
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-slate-50 rounded-full">
                <DynamicIcon name={showHelp.icono} color={showHelp.color_hex} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tighter italic">Guía: {showHelp.nombre}</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                {showHelp.descripcion_larga || `Usa esta categoría para organizar tus operaciones de ${showHelp.nombre.toLowerCase()}.`}
              </p>
              <button onClick={() => setShowHelp(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-colors">Entendido</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600">
              <Settings2 size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Workspace Contable</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Diseñador de Plantillas</h1>
          </div>
          <button 
            onClick={guardarPlantilla}
            disabled={loading || !conceptoPlantilla}
            className={`hidden md:flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!loading && conceptoPlantilla ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Save size={16} /> {loading ? "Sincronizando..." : "Guardar Plantilla"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">01</div>
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Identificación</h2>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Concepto Global</label>
                  <input 
                    type="text" 
                    value={conceptoPlantilla} 
                    onChange={(e) => setConceptoPlantilla(e.target.value)} 
                    placeholder="Ej: Pago de Luz Sedapar" 
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300" 
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Categoría</label>
                  <div className="grid grid-cols-2 gap-3">
                    {categorias.map((cat) => (
                      <div key={cat.id} className="relative group">
                        <button
                          onClick={() => setCategoriaSeleccionada(cat.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${categoriaSeleccionada === cat.id ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/10' : 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'}`}
                        >
                          <DynamicIcon name={cat.icono} color={cat.color_hex} />
                          <span className={`text-[10px] font-black uppercase ${categoriaSeleccionada === cat.id ? 'text-indigo-600' : 'text-slate-500'}`}>{cat.nombre}</span>
                        </button>
                        <button onClick={() => setShowHelp(cat)} className="absolute -top-1 -right-1 bg-white text-slate-300 hover:text-indigo-500 rounded-full p-1 border border-slate-100 shadow-sm transition-transform hover:scale-110"><HelpCircle size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">02</div>
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Esquema Partida Doble</h2>
                </div>
                <button onClick={agregarNuevaFila} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase group">
                  <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Añadir Línea
                </button>
              </div>

              <div className="space-y-3">
                {filas.map((f, i) => (
                  <div key={i} className="group relative grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all shadow-sm shadow-transparent hover:shadow-indigo-500/5">
                    <div className="col-span-1 text-[10px] font-black text-slate-300 text-center">{i + 1}</div>
                    <div className="col-span-10 relative">
                      <input 
                        className="w-full p-3 bg-transparent font-bold text-xs outline-none text-slate-600" 
                        placeholder="Buscar cuenta contable..." 
                        value={textoBusqueda[i] || ''} 
                        onChange={(e) => buscarCuentas(e.target.value, i)} 
                      />
                      {filaActiva === i && sugerencias.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-top-1">
                          {sugerencias.map((s) => (
                            <div key={s.codigo} onClick={() => seleccionarCuenta(s, i)} className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors">
                              <span className="text-[11px] font-bold text-slate-700">{s.nombre}</span>
                              <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">{s.codigo}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => eliminarFila(i)} className="col-span-1 text-slate-200 hover:text-red-500 flex justify-center transition-colors"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>

              {/* VALIDADOR DINÁMICO */}
              <div className={`mt-8 p-5 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex items-start gap-4 ${filas.length % 2 === 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                <div className={`p-2.5 rounded-xl shadow-sm ${filas.length % 2 === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  {filas.length % 2 === 0 ? (
                    <CheckCircle2 className="text-white" size={18} />
                  ) : (
                    <AlertCircle className="text-white" size={18} />
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className={`text-[11px] font-black uppercase tracking-widest ${filas.length % 2 === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {filas.length % 2 === 0 ? "Estructura Balanceada" : "Alerta de Partida Doble"}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                    {filas.length % 2 === 0 
                      ? `Has configurado ${filas.length} líneas. Este diseño respeta el principio de equilibrio: no hay deudor sin acreedor, asegurando un asiento cuadrado.`
                      : `Atención: Tienes ${filas.length} líneas (número impar). En la contabilidad profesional, los asientos suelen ser pares para garantizar que el DEBE y el HABER coincidan.`}
                  </p>
                </div>
              </div>
            </section>

            <button 
              onClick={guardarPlantilla}
              disabled={loading || !conceptoPlantilla}
              className="md:hidden w-full mt-6 p-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-transform"
            >
              {loading ? "Sincronizando..." : " Guardar Plantilla"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}