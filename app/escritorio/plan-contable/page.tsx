"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Search, Loader2, Plus, Trash2, X, AlertCircle, Zap, Check, Trash, 
  ChevronRight, ChevronDown, PlusCircle, Settings2, Folder, FolderOpen
} from 'lucide-react'

/**
 * interfaz robusta para el plan contable
 * alineada al 100% con tu tabla de base de datos (public.mis_cuentas)
 */
interface CuentaContable {
  id?: string;
  user_id?: string;
  codigo: string;
  nombre: string;
  tipo: number | null;
  tipo_letra: string | null;
  descripcion: string | null;
  clase_cuenta?: number | null;
  es_predeterminado?: boolean;
  nivel: number | null;
  es_registro: boolean; // true = registro, false = título
  padre_codigo: string | null;
}

export default function PlanMaestroMultiusuario() {
  // --- estados principales del sistema ---
  const [loading, setLoading] = useState(true)
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [busqueda, setBusqueda] = useState('')
  
  // --- estado del acordeón para jerarquía visual ---
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})
  
  // --- estados para gestión de modales (detallados y robustos) ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false) 
  const [modalBorrar, setModalBorrar] = useState<{
    open: boolean, 
    id: string | null, 
    nombre: string, 
    status: 'confirm' | 'success',
    codigo_borrar?: string,
    padre_codigo?: string | null
  }>({
    open: false, id: null, nombre: '', status: 'confirm'
  })
  
  // --- estado inicial para nuevas cuentas ---
  const estadoInicial: Omit<CuentaContable, 'id'> = { 
    codigo: '', 
    nombre: '', 
    tipo: 1, 
    descripcion: '', 
    tipo_letra: 'activo',
    nivel: 1,
    es_registro: true,
    padre_codigo: '' 
  }
  
  const [nuevo, setNuevo] = useState(estadoInicial)
  const [errorForm, setErrorForm] = useState('')

  // --- efectos iniciales de sincronización con el servidor ---
  useEffect(() => { 
    inicializarSistema() 
  }, [])

  /**
   * carga los datos desde la tabla public.mis_cuentas de supabase
   */
  const inicializarSistema = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: misCuentas, error } = await supabase
        .from('mis_cuentas')
        .select('*')
        .eq('user_id', user.id)
        .order('codigo')

      if (error) throw error;
      if (misCuentas) {
        setCuentas(misCuentas);
        // Iniciamos con el acordeón cerrado por defecto
        setExpandidos({});
      }
    } catch (err) {
      console.error("error fatal al cargar datos de supabase:", err)
    } finally {
      setTimeout(() => setLoading(false), 800)
    }
  }

  /**
   * expande o colapsa los hijos de una cuenta específica
   */
  const toggleExpandir = (codigo: string) => {
    setExpandidos(prev => ({
      ...prev,
      [codigo]: !prev[codigo]
    }))
  }

  const detectarTipoGlobal = (cod: string) => {
    if (!cod) return { tipo: 1, letra: 'activo' };
    const primer = cod.charAt(0)
    const mapping: Record<string, { tipo: number; letra: string }> = {
      '1': { tipo: 1, letra: 'activo' }, 
      '2': { tipo: 1, letra: 'activo' }, 
      '3': { tipo: 1, letra: 'activo' }, 
      '4': { tipo: 2, letra: 'pasivo' }, 
      '5': { tipo: 2, letra: 'patrimonio' }, 
      '6': { tipo: 4, letra: 'gasto (nat)' }, 
      '7': { tipo: 3, letra: 'ingreso' },
      '8': { tipo: 5, letra: 'gasto (fun)' },
      '9': { tipo: 5, letra: 'gasto (fun)' }
    }
    return mapping[primer] || { tipo: 1, letra: 'activo' }
  }

  /**
   * ACTUALIZACIÓN PERSISTENTE DE ESTADO: toggleEstadoRegistro
   */
  const toggleEstadoRegistro = async (cuenta: CuentaContable) => {
    if (!cuenta.id) return;
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const nuevoEstado = !cuenta.es_registro;

    try {
      const { error } = await supabase
        .from('mis_cuentas')
        .update({ es_registro: nuevoEstado })
        .eq('id', cuenta.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setCuentas(prev => prev.map(c => 
        c.id === cuenta.id ? { ...c, es_registro: nuevoEstado } : c
      ));
    } catch (err) {
      console.error("error de persistencia:", err);
      await inicializarSistema(); 
    }
  }

  /**
   * Sugerencia inteligente: Si el padre es de 3 dígitos, sugiere 5.
   */
  const prepararSubcuenta = (padre: CuentaContable) => {
    const hijos = cuentas.filter(c => c.padre_codigo === padre.codigo);
    let nuevoCodigo = "";
    
    if (padre.codigo.length === 3) {
      let correlativo = 1;
      if (hijos.length > 0) {
        const ultimosDigitos = hijos.map(h => parseInt(h.codigo.slice(-2)));
        correlativo = Math.max(...ultimosDigitos.filter(n => !isNaN(n))) + 1;
      }
      nuevoCodigo = `${padre.codigo}${correlativo.toString().padStart(2, '0')}`;
    } else {
      nuevoCodigo = `${padre.codigo}${hijos.length + 1}`;
    }

    const info = detectarTipoGlobal(nuevoCodigo);

    setNuevo({
      ...estadoInicial,
      codigo: nuevoCodigo,
      padre_codigo: padre.codigo,
      nivel: (padre.nivel || 1) + 1,
      tipo: info.tipo,
      tipo_letra: info.letra
    });
    setIsModalOpen(true);
  }

  const cerrarYLimpiarModal = () => {
    setNuevo(estadoInicial); 
    setErrorForm(''); 
    setIsModalOpen(false); 
    setShowSuccess(false)
  }

  /**
   * Detección manual de jerarquía para códigos de 5 dígitos
   */
  const handleCodigoChange = (val: string) => {
    const info = detectarTipoGlobal(val)
    let p_codigo = '';
    let nivel_detectado = 1;

    if (val.length >= 5) {
      p_codigo = val.substring(0, 3);
      nivel_detectado = 3;
    } else if (val.length >= 3) {
      p_codigo = val.substring(0, 2);
      nivel_detectado = 2;
    } else if (val.length > 1) {
      p_codigo = val.substring(0, 1);
      nivel_detectado = 1;
    }

    setNuevo({ 
      ...nuevo, 
      codigo: val,
      tipo: info.tipo,
      tipo_letra: info.letra,
      padre_codigo: p_codigo,
      nivel: nivel_detectado
    })
  }

  /**
   * guarda la nueva cuenta en supabase
   */
  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cuentas.some(c => c.codigo === nuevo.codigo)) {
      setErrorForm(`el código ${nuevo.codigo} ya existe.`); 
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase.from('mis_cuentas').insert([{
      codigo: nuevo.codigo,
      nombre: nuevo.nombre.toLowerCase(),
      descripcion: nuevo.descripcion?.toLowerCase() || '',
      tipo: nuevo.tipo,
      tipo_letra: nuevo.tipo_letra,
      nivel: nuevo.nivel,
      es_registro: nuevo.es_registro,
      padre_codigo: nuevo.padre_codigo || null,
      user_id: user.id 
    }]).select()

    if (!error && data) {
      if (nuevo.padre_codigo) {
        await supabase.from('mis_cuentas')
          .update({ es_registro: false })
          .eq('codigo', nuevo.padre_codigo)
          .eq('user_id', user.id)
      }
      await inicializarSistema()
      setShowSuccess(true)
      setTimeout(() => cerrarYLimpiarModal(), 1500)
    }
  }

  // --- FUNCIÓN RESTAURADA: confirmarBorrado ---
  const confirmarBorrado = (cuenta: CuentaContable) => {
    setModalBorrar({ 
      open: true, id: cuenta.id || null, nombre: cuenta.nombre, status: 'confirm',
      codigo_borrar: cuenta.codigo, padre_codigo: cuenta.padre_codigo
    })
  }

  const ejecutarEliminacion = async () => {
    if (!modalBorrar.id) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase
        .from('mis_cuentas')
        .delete()
        .eq('id', modalBorrar.id)
        .eq('user_id', user.id)

      if (!error) {
        if (modalBorrar.padre_codigo) {
          const hijosRestantes = cuentas.filter(c => 
            c.padre_codigo === modalBorrar.padre_codigo && c.id !== modalBorrar.id
          );
          if (hijosRestantes.length === 0) {
            await supabase.from('mis_cuentas')
              .update({ es_registro: true })
              .eq('codigo', modalBorrar.padre_codigo)
              .eq('user_id', user.id);
          }
        }
        await inicializarSistema()
        setModalBorrar(prev => ({ ...prev, status: 'success' }))
        setTimeout(() => setModalBorrar({ 
          open: false, id: null, nombre: '', status: 'confirm' 
        }), 1500)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const esVisible = (cuenta: CuentaContable) => {
    if (busqueda.length > 0) return true; 
    if (cuenta.codigo.length <= 2) return true;
    return expandidos[cuenta.padre_codigo || ""] === true;
  }

  const getFilaEstilo = (tipo: number | null, esRegistro: boolean) => {
    const t = tipo || 1;
    const estilos: Record<number, string> = {
      1: esRegistro ? 'bg-blue-50/40 border-l-blue-500' : 'bg-blue-100/20 border-l-blue-900 font-black',
      2: esRegistro ? 'bg-red-50/40 border-l-red-500' : 'bg-red-100/20 border-l-red-900 font-black',
      3: esRegistro ? 'bg-emerald-50/40 border-l-emerald-500' : 'bg-emerald-100/20 border-l-emerald-900 font-black',
      4: esRegistro ? 'bg-amber-50/40 border-l-amber-500' : 'bg-amber-100/20 border-l-amber-900 font-black',
      5: esRegistro ? 'bg-slate-100/60 border-l-slate-400' : 'bg-slate-200/40 border-l-slate-800 font-black',
      7: esRegistro ? 'bg-indigo-50/40 border-l-indigo-500' : 'bg-indigo-100/20 border-l-indigo-900 font-black'
    }
    return (estilos[t] || 'bg-white border-l-slate-200') + ' border-l-4'
  }

  const getColorByTipo = (tipo: number | string | null) => {
    const t = tipo?.toString() || '1';
    const colors: Record<string, string> = {
      '1': 'text-blue-600', '2': 'text-red-600', '3': 'text-emerald-600', 
      '4': 'text-amber-600', '5': 'text-slate-600', '7': 'text-indigo-600'
    }
    return colors[t] || 'text-slate-400'
  }

  const filtrados = cuentas.filter(c => 
    esVisible(c) && (
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
      c.codigo?.includes(busqueda)
    )
  )

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={50} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">sincronizando base de datos contable...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 font-sans tracking-tight text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 pb-10">
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic lowercase">plan maestro</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 italic">jerarquía inteligente</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input onChange={(e) => setBusqueda(e.target.value)} value={busqueda} placeholder="buscar cuenta..." className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm lowercase" />
            </div>
            <button onClick={() => { setNuevo(estadoInicial); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-2 italic">
              <Plus size={18} /> nueva cuenta raíz
            </button>
          </div>
        </header>

        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden pb-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-black italic">
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] lowercase">jerarquía / código</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] lowercase">nombre detalle</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-center lowercase">estado (persistente)</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-center w-24 lowercase">acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((c) => {
                const tieneHijos = cuentas.some(h => h.padre_codigo === c.codigo);
                const estaExpandido = expandidos[c.codigo];
                return (
                  <tr key={c.id} className={`${getFilaEstilo(c.tipo, c.es_registro)} transition-all group border-b border-white/10 animate-in fade-in duration-300`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3" style={{ marginLeft: `${((c.nivel || 1) - 1) * 24}px` }}>
                         <div className="w-6">
                           {!c.es_registro && (
                             <button onClick={() => toggleExpandir(c.codigo)} className="p-1 hover:bg-black/5 rounded-md transition-colors">
                               {estaExpandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                             </button>
                           )}
                         </div>
                         <div className="relative flex items-center gap-2">
                           <span className={`px-3 py-1.5 rounded-xl border font-mono text-[11px] ${c.es_registro ? 'bg-white font-black text-slate-900 shadow-sm border-slate-200' : 'bg-slate-900 text-white font-bold border-slate-800'}`}>
                             {c.codigo}
                           </span>
                           <button onClick={() => prepararSubcuenta(c)} className="opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-indigo-50 text-white rounded-lg hover:bg-indigo-600 shadow-lg active:scale-95"><PlusCircle size={12} strokeWidth={4} /></button>
                         </div>
                      </div>
                    </td>
                    <td className={`px-8 py-5 text-[13px] lowercase italic ${!c.es_registro ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      <div className="flex items-center gap-2">
                        {!c.es_registro ? (estaExpandido ? <FolderOpen size={14} className="text-slate-400" /> : <Folder size={14} className="text-slate-400" />) : <Zap size={10} className="text-indigo-500 fill-current" />}
                        {c.nombre}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => toggleEstadoRegistro(c)} className={`text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-sm flex items-center gap-2 mx-auto italic ${c.es_registro ? 'bg-white text-slate-900 border border-slate-200' : 'bg-slate-900 text-white'}`}>
                         {c.es_registro ? 'registro' : 'título'} <Settings2 size={10} className={c.es_registro ? 'text-slate-300' : 'text-slate-500'} />
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => confirmarBorrado(c)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- modal para agregar nuevas cuentas --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl relative border border-slate-100 animate-in zoom-in duration-200">
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"><Check size={40} /></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic lowercase">¡guardado con éxito!</h2>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic lowercase">configurar cuenta</h2>
                  <button onClick={cerrarYLimpiarModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <form onSubmit={handleAgregar} className="space-y-5">
                  <div className="bg-indigo-50 p-4 rounded-2xl flex items-center gap-3 text-indigo-600">
                    <Zap size={20} fill="currentColor" />
                    <p className="text-[10px] font-black uppercase tracking-tight italic">padre detectado: {nuevo.padre_codigo || 'raíz'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">código</label>
                      <input required value={nuevo.codigo} onChange={e => handleCodigoChange(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none shadow-inner" />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 text-indigo-500 italic">tipo</label>
                      <input disabled value={nuevo.tipo_letra || ''} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-black outline-none border-2 border-slate-100 text-indigo-600" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">nombre detalle</label>
                      <input required value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none shadow-inner lowercase" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">descripción adicional</label>
                      <textarea value={nuevo.descripcion || ''} onChange={e => setNuevo({...nuevo, descripcion: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none h-24 resize-none shadow-inner lowercase" />
                    </div>
                    <div className="col-span-1 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100/50">
                       <input type="checkbox" checked={nuevo.es_registro} onChange={e => setNuevo({...nuevo, es_registro: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                       <label className="text-[10px] font-black uppercase text-slate-600 italic lowercase">¿es registro?</label>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95 italic">guardar en multinivel</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- modal de borrado seguro detallado --- */}
      {modalBorrar.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center border border-slate-100">
            {modalBorrar.status === 'success' ? (
              <div className="flex flex-col items-center py-6 animate-in zoom-in">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Check size={40} /></div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic lowercase">¡eliminado con éxito!</h2>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash size={32} /></div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic lowercase">¿estás totalmente seguro?</h2>
                <p className="text-sm font-bold text-slate-400 mb-8 italic">vas a eliminar la cuenta <span className="text-slate-900 font-black">"{modalBorrar.nombre}"</span> de forma permanente.</p>
                <div className="flex gap-4">
                  <button onClick={() => setModalBorrar({ open: false, id: null, nombre: '', status: 'confirm' })} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all italic">cancelar</button>
                  <button onClick={ejecutarEliminacion} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-100 transition-all italic">sí, eliminar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}