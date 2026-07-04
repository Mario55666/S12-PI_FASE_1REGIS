import { useState, useRef, useEffect } from 'react'
import {
  Users, BookOpen, FileText,
  CheckCircle, XCircle, Upload, Image as ImageIcon,
  Zap, Shield,
  Fingerprint, Trash2, Plus,
  HelpCircle, ArrowRight, Pen, Info,
  GraduationCap, Calendar, UserCheck,
  Printer, Mail, Download, Undo,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { jsPDF } from 'jspdf'

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface Estudiante {
  id: number
  nombres: string
  apellidos: string
  dni: string
  correo: string
  firma: string | null
  rol: string
  responsabilidad: string
}

interface Pieza {
  id: number
  nombre: string
  archivo: string | null
  tipo: 'cuento' | 'infografia' | 'juego'
  mejoras: string
}

/* ═══════════════════════════════════════════════════════════
   HELP TOOLTIP COMPONENT
   ═══════════════════════════════════════════════════════════ */

function HelpTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-[#7b2cff] hover:text-[#00f5ff] transition-colors focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#1a0f2e] border border-[#00f5ff]/40 rounded-lg shadow-lg shadow-[#00f5ff]/10 pointer-events-none">
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#1a0f2e] border-b border-r border-[#00f5ff]/40 rotate-45" />
          <p className="text-[10px] text-[#e7e7ff]/80 leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   FIELD HELP TEXTS
   ═══════════════════════════════════════════════════════════ */

const HELP = {
  nombreEquipo: 'Ingresa el nombre oficial de tu equipo de trabajo. Este nombre aparecera en todos los documentos y piezas graficas. Ejemplo: Valor de la Amistad',
  fecha: 'Selecciona la fecha en que presentas este informe de estado de arte. Debe ser la fecha de la sesion de aprendizaje.',
  nombres: 'Escribe tus nombres completos como aparecen en tu DNI. Empieza con tu nombre de pila. Ejemplo: Marcelo Gregorio',
  apellidos: 'Escribe tus apellidos completos como aparecen en tu DNI. Primero el apellido paterno, luego el materno. Ejemplo: Campos Nacido',
  dni: 'Ingresa los 8 digitos de tu Documento Nacional de Identidad (DNI). Solo numeros, sin espacios ni guiones.',
  correo: 'Ingresa tu correo institucional del IDC. Generalmente tiene el formato: nombre.apellido@idcallao.edu.pe',
  firma: 'Dibuja tu firma digital en el recuadro usando el mouse o tu dedo (en tactil). El fondo es transparente. Luego descarga con "Agregar firma PNG".',
  piezaNombre: 'Escribe un nombre descriptivo para la pieza grafica. Ejemplo: Portada del Cuento Infantil - El Bosque Encantado',
  piezaArchivo: 'Sube la imagen de tu pieza grafica. Formatos: PNG, JPG, JPEG. Tamaño maximo: 5MB. La imagen debe estar en alta calidad.',
  piezaMejoras: 'Describe las mejoras que vas a implementar en esta pieza grafica para cumplir los criterios de evaluacion. Se especifico y detallado.',
}

/* ═══════════════════════════════════════════════════════════
   FILE SIZE UTILS
   ═══════════════════════════════════════════════════════════ */

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/* ═══════════════════════════════════════════════════════════
   INITIAL DATA
   ═══════════════════════════════════════════════════════════ */

const ESTUDIANTES_INICIAL: Estudiante[] = [
  { id: 1, nombres: '', apellidos: '', dni: '', correo: '', firma: null, rol: 'Responsable de Estilos de Arte', responsabilidad: 'Verifica y aplica que los estilos de arte sean los mismos establecidos' },
  { id: 2, nombres: '', apellidos: '', dni: '', correo: '', firma: null, rol: 'Coordinadora de Estilo', responsabilidad: 'Coordina y supervisa la unificacion del estilo de los proyectos' },
  { id: 3, nombres: '', apellidos: '', dni: '', correo: '', firma: null, rol: 'Diagramacion y Organizacion', responsabilidad: 'Diagramacion y supervision de la organizacion de la informacion' },
  { id: 4, nombres: '', apellidos: '', dni: '', correo: '', firma: null, rol: 'Verificador de Responsabilidades', responsabilidad: 'Verifica que todos los miembros cumplan con sus responsabilidades' },
  { id: 5, nombres: '', apellidos: '', dni: '', correo: '', firma: null, rol: 'Evaluadora de Presentaciones', responsabilidad: 'Evalua las presentaciones finales de cada proyecto' },
]

/* ═══════════════════════════════════════════════════════════
   SIGNATURE PAD — PNG TRANSPARENT EXPORT
   ═══════════════════════════════════════════════════════════ */

function SignaturePad({ value, onChange, label, estudianteId }: { value: string | null; onChange: (v: string) => void; label: string; estudianteId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const { x, y } = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#00f5ff'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const { x, y } = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawing(true)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current!
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
    onChange('')
  }

  const exportTransparentPNG = () => {
    const canvas = canvasRef.current!
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ctx = exportCanvas.getContext('2d')!
    ctx.drawImage(canvas, 0, 0)
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = '#00f5ff'
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

    const link = document.createElement('a')
    link.download = `firma_estudiante_${estudianteId}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = document.createElement('img')
      img.onload = () => {
        const ctx = canvasRef.current!.getContext('2d')!
        ctx.clearRect(0, 0, 300, 100)
        ctx.drawImage(img, 0, 0)
      }
      img.src = value
      setHasDrawing(true)
    }
  }, [value])

  return (
    <div className="space-y-2">
      <Label className="text-xs text-[#e7e7ff]/70 flex items-center">
        <Pen className="w-3 h-3 text-[#00f5ff] mr-1" /> {label}
        <HelpTooltip text={HELP.firma} />
      </Label>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={300}
          height={100}
          className="w-full h-[100px] border border-[#7b2cff]/30 rounded-lg cursor-crosshair touch-none"
          style={{ background: 'transparent' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {hasDrawing && (
          <div className="absolute top-1 right-1 flex gap-1">
            <button type="button" onClick={clear} className="p-1 bg-[#ff2aa3]/20 hover:bg-[#ff2aa3]/40 rounded text-[#ff2aa3] transition-colors" title="Borrar firma">
              <Undo className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-[#e7e7ff]/30 flex-1">Dibuja tu firma (mouse o tactil), fondo transparente</p>
        {hasDrawing && (
          <button type="button" onClick={exportTransparentPNG} className="flex items-center gap-1 px-2 py-1 bg-[#00f5ff]/10 border border-[#00f5ff]/30 rounded text-[10px] text-[#00f5ff] hover:bg-[#00f5ff]/20 transition-colors">
            <Download className="w-3 h-3" /> Agregar firma PNG
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   IMAGE UPLOAD WITH SIZE LIMIT
   ═══════════════════════════════════════════════════════════ */

function ImageUpload({ onImageSelect, preview }: { onImageSelect: (base64: string) => void; preview: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > MAX_FILE_SIZE) {
      setError(`El archivo pesa ${formatSize(file.size)}. El tamano maximo permitido es ${formatSize(MAX_FILE_SIZE)}.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Formato no valido. Solo se aceptan: PNG, JPG, JPEG.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setFileInfo({ name: file.name, size: formatSize(file.size) })

    const reader = new FileReader()
    reader.onloadend = () => onImageSelect(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-[#e7e7ff]/50 flex items-center">
        Imagen de la pieza <HelpTooltip text={HELP.piezaArchivo} />
      </Label>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFile} className="hidden" />
      <div
        onClick={() => inputRef.current?.click()}
        className="w-full h-40 border-2 border-dashed border-[#7b2cff]/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#00f5ff]/50 hover:bg-[#00f5ff]/5 transition-all"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-[#7b2cff] mb-2" />
            <span className="text-xs text-[#e7e7ff]/40">Click para subir imagen</span>
            <span className="text-[10px] text-[#e7e7ff]/20">PNG, JPG, JPEG | Max: {formatSize(MAX_FILE_SIZE)}</span>
          </>
        )}
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-[#ff2aa3]">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {fileInfo && preview && (
        <div className="text-[10px] text-[#00f5ff]">
          {fileInfo.name} ({fileInfo.size})
        </div>
      )}
      {preview && (
        <button type="button" onClick={() => { onImageSelect(''); setFileInfo(null); setError(null); if (inputRef.current) inputRef.current.value = '' }} className="text-[10px] text-[#ff2aa3] hover:underline flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> Eliminar imagen
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   DEMO TUTORIAL MODAL
   ═══════════════════════════════════════════════════════════ */

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)

  const tutorialSteps: Array<{ title: string; desc: string; icon: React.ElementType; color: string }> = [
    { title: 'Bienvenido al Formulario', desc: 'Este formulario es para reportar el estado de arte de tus proyectos finales de curso. Sigue los pasos para completarlo correctamente. Todos los campos tienen un icono de ayuda (?) que explica que informacion ingresar.', icon: Info, color: '#00f5ff' },
    { title: 'Paso 1: Datos del Equipo', desc: 'Ingresa el nombre del equipo y selecciona la fecha. El icono ? junto a cada campo te explica que informacion ingresar.', icon: Users, color: '#ff2aa3' },
    { title: 'Paso 2: Datos de Cada Estudiante', desc: 'Cada miembro debe llenar sus NOMBRES, APELLIDOS, DNI, CORREO INSTITUCIONAL y dibujar su FIRMA DIGITAL. Los campos de rol y responsabilidad ya estan pre-llenados. Pasa el mouse sobre el icono ? para ver la ayuda.', icon: UserCheck, color: '#7b2cff' },
    { title: 'Paso 3: Agregar Firmas PNG', desc: 'Dibuja tu firma en el recuadro transparente y luego click en "Agregar firma PNG" para descargarla con fondo transparente.', icon: Fingerprint, color: '#ffe600' },
    { title: 'Paso 4: Subir Piezas Graficas', desc: 'Carga las piezas graficas elegidas para cada proyecto. Tamaño maximo: 5MB. Formatos: PNG, JPG, JPEG. Puedes agregar multiples piezas con el boton "Agregar pieza".', icon: ImageIcon, color: '#00f5ff' },
    { title: 'Paso 5: Indicar Mejoras', desc: 'Para cada pieza subida, describe las mejoras que implementaras. Se especifico sobre que cambios haras para cumplir los criterios de evaluacion.', icon: Zap, color: '#ff2aa3' },
    { title: 'Paso 6: Contrato de Derechos', desc: 'Lee el contrato de derechos de autor cuidadosamente. Todos los miembros deben aceptar que los derechos pertenecen al equipo equitativamente.', icon: Shield, color: '#7b2cff' },
    { title: 'Paso 7: Imprimir PDF', desc: 'Revisa que todos los campos esten llenos y haz click en "IMPRIMIR PDF". Se generara un PDF oficial con marca de agua CONFIDENCIAL, firmas, piezas y todas las clausulas del contrato.', icon: Printer, color: '#00ff88' }
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="retro-card max-w-md w-full p-6 border border-[#00f5ff]/40 neon-box-cyan" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-[#00f5ff]" />
            <h2 className="text-lg font-bold gradient-text-retro font-[Orbitron]">GUIA DE USO</h2>
          </div>
          <button onClick={onClose} className="text-[#e7e7ff]/50 hover:text-[#ff2aa3]"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="text-center mb-4">
          <span className="text-xs mono text-[#7b2cff]">PASO {step + 1} DE {tutorialSteps.length}</span>
          <div className="h-1 bg-[#0b0b0f] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ff2aa3] to-[#00f5ff] transition-all" style={{ width: `${((step + 1) / tutorialSteps.length) * 100}%` }} />
          </div>
        </div>
        <div className="bg-[#1a0f2e] rounded-lg p-4 mb-4 border border-[#7b2cff]/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tutorialSteps[step].color}20`, border: `1px solid ${tutorialSteps[step].color}40` }}>
              {(() => { const StepIcon = tutorialSteps[step].icon; return <StepIcon className="w-5 h-5" style={{ color: tutorialSteps[step].color }} /> })()}
            </div>
            <h3 className="text-sm font-bold text-[#e7e7ff] font-[Orbitron]">{tutorialSteps[step].title}</h3>
          </div>
          <p className="text-xs text-[#e7e7ff]/60 leading-relaxed">{tutorialSteps[step].desc}</p>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="border-[#7b2cff]/30 text-[#e7e7ff]/50 text-xs disabled:opacity-20">Anterior</Button>
          {step < tutorialSteps.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} className="bg-gradient-to-r from-[#ff2aa3] to-[#7b2cff] text-white text-xs font-[Orbitron]">Siguiente <ArrowRight className="w-3 h-3 ml-1" /></Button>
          ) : (
            <Button size="sm" onClick={onClose} className="bg-gradient-to-r from-[#00f5ff] to-[#7b2cff] text-white text-xs font-[Orbitron]">Entendido <CheckCircle className="w-3 h-3 ml-1" /></Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN FORM PAGE
   ═══════════════════════════════════════════════════════════ */

export default function Home() {
  const [nombreEquipo, setNombreEquipo] = useState('Valor de la Amistad')
  const [fecha, setFecha] = useState('2026-06-26')
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>(ESTUDIANTES_INICIAL)
  const [piezas, setPiezas] = useState<Pieza[]>([{ id: 1, nombre: '', archivo: null, tipo: 'cuento', mejoras: '' }])
  const [contratoAceptado, setContratoAceptado] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const updateEstudiante = (id: number, field: keyof Estudiante, value: string) => {
    setEstudiantes(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const updatePieza = (id: number, field: keyof Pieza, value: string) => {
    setPiezas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const addPieza = () => {
    const tipos: Array<'cuento' | 'infografia' | 'juego'> = ['cuento', 'infografia', 'juego']
    const tipo = tipos[piezas.length % 3]
    setPiezas(prev => [...prev, { id: Date.now(), nombre: '', archivo: null, tipo, mejoras: '' }])
  }
  const removePieza = (id: number) => setPiezas(prev => prev.filter(p => p.id !== id))

  /* ─── PDF GENERATOR ─── */
  const generatePDF = () => {
    const incomplete = estudiantes.filter(e => !e.nombres || !e.apellidos || !e.dni || !e.correo)
    if (incomplete.length > 0) {
      alert('Por favor completa NOMBRES, APELLIDOS, DNI y CORREO INSTITUCIONAL de todos los estudiantes.')
      return
    }
    if (!contratoAceptado) {
      alert('Debes aceptar el contrato de derechos de autor.')
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Security metadata
    doc.setProperties({
      title: 'Formulario Estado de Arte - Proyecto Ilustrador 2026',
      subject: 'Contrato de Derechos de Autor - Equipo Valor de la Amistad',
      author: 'Mg. Mario Quiroz Martinez',
      creator: 'IDC - Instituto de Educacion Superior Publico',
      keywords: 'contrato, derechos de autor, proyecto ilustrador, IDC',
    })

    let y = 15

    // ── Header ──
    doc.setFillColor(11, 11, 15)
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setDrawColor(0, 245, 255)
    doc.setLineWidth(0.5)
    doc.line(10, 28, pageWidth - 10, 28)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('IDC - Instituto de Educacion Superior Publico', pageWidth / 2, 12, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(0, 245, 255)
    doc.text('Diseno & Comunicacion', pageWidth / 2, 18, { align: 'center' })
    doc.setTextColor(255, 42, 163)
    doc.setFontSize(8)
    doc.text('DOCUMENTO OFICIAL - CONFIDENCIAL', pageWidth / 2, 24, { align: 'center' })

    y = 35

    // ── Title ──
    doc.setTextColor(0, 245, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('FORMULARIO DE ESTADO DE ARTE', pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(200, 200, 255)
    doc.text(`Curso: Proyecto Ilustrador 2026 | Semana 12`, pageWidth / 2, y, { align: 'center' })
    y += 6
    doc.setTextColor(255, 42, 163)
    doc.text(`Equipo: ${nombreEquipo}`, pageWidth / 2, y, { align: 'center' })
    y += 10

    // ── Team Members ──
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('1. MIEMBROS DEL EQUIPO', 10, y)
    y += 5
    doc.setDrawColor(123, 44, 255)
    doc.setLineWidth(0.3)
    doc.line(10, y, pageWidth - 10, y)
    y += 4

    estudiantes.forEach((est, i) => {
      if (y > 270) { doc.addPage(); y = 15 }
      doc.setFontSize(9)
      doc.setTextColor(0, 245, 255)
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}. ${est.nombres} ${est.apellidos}`, 12, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 200, 255)
      doc.setFontSize(8)
      doc.text(`   DNI: ${est.dni}`, 12, y)
      y += 3
      doc.text(`   Correo: ${est.correo}`, 12, y)
      y += 3
      doc.text(`   Rol: ${est.rol}`, 12, y)
      y += 3
      doc.text(`   Responsabilidad: ${est.responsabilidad}`, 12, y)
      y += 4

      if (est.firma) {
        try {
          const imgW = 40
          const imgH = 12
          doc.addImage(est.firma, 'PNG', 12, y, imgW, imgH, '', 'FAST')
          doc.setTextColor(100, 100, 100)
          doc.setFontSize(6)
          doc.text(`Firma digital - ${est.nombres} ${est.apellidos}`, 12, y + imgH + 2)
          y += imgH + 5
        } catch { /* skip if invalid */ }
      }
      y += 2
    })

    y += 4

    // ── Piezas ──
    if (y > 230) { doc.addPage(); y = 15 }
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('2. PIEZAS GRAFICAS ELEGIDAS', 10, y)
    y += 5
    doc.setDrawColor(123, 44, 255)
    doc.line(10, y, pageWidth - 10, y)
    y += 4

    piezas.forEach((pieza, i) => {
      if (y > 250 && pieza.archivo) { doc.addPage(); y = 15 }
      doc.setFontSize(9)
      doc.setTextColor(255, 234, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`Pieza #${i + 1} - ${pieza.tipo.toUpperCase()}`, 12, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 200, 255)
      doc.setFontSize(8)
      doc.text(`Nombre: ${pieza.nombre || '(sin nombre)'}`, 12, y)
      y += 3
      if (pieza.archivo) {
        try {
          const imgW = 80
          const imgH = 50
          doc.addImage(pieza.archivo, 'JPEG', 12, y, imgW, imgH, '', 'FAST')
          y += imgH + 2
        } catch { doc.text('(Imagen no disponible para PDF)', 12, y); y += 4 }
      }
      doc.setTextColor(0, 245, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Mejoras a implementar:', 12, y)
      y += 3
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 200, 255)
      const mejorasLines = doc.splitTextToSize(pieza.mejoras || '(Sin mejoras indicadas)', pageWidth - 24)
      doc.text(mejorasLines, 12, y)
      y += mejorasLines.length * 3.5 + 4
    })

    // ── Contract ──
    if (y > 200) { doc.addPage(); y = 15 }
    doc.setFontSize(11)
    doc.setTextColor(255, 42, 163)
    doc.setFont('helvetica', 'bold')
    doc.text('3. CONTRATO DE DERECHOS DE AUTOR', 10, y)
    y += 5
    doc.setDrawColor(255, 42, 163)
    doc.line(10, y, pageWidth - 10, y)
    y += 5

    const clausulas = [
      ['CLÁUSULA 1 - PROPIEDAD INTELECTUAL COMPARTIDA:', 'Los derechos de autor de todos los proyectos desarrollados en el curso de Proyecto Ilustrador 2026 pertenecen de manera equitativa y conjunta a todos los miembros del equipo "Valor de la Amistad".'],
      ['CLÁUSULA 2 - REGISTRO EN PIEZAS GRÁFICAS:', 'Todas las piezas gráficas presentadas deben incluir el crédito completo de todos los miembros del equipo en todas las piezas gráficas presentadas.'],
      ['CLÁUSULA 3 - RENUNCIA AL EQUIPO:', 'Si un miembro renuncia al equipo, debe presentar una carta poder indicando que cede sus derechos de participación creativa, intelectual y funcional a los demás miembros del equipo.'],
      ['CLÁUSULA 4 - DISTRIBUCIÓN EQUITATIVA:', 'Los beneficios y reconocimientos serán distribuidos de manera equitativa entre todos los miembros activos.']
    ]

    clausulas.forEach(([title, body]) => {
      if (y > 260) { doc.addPage(); y = 15 }
      doc.setFontSize(8)
      doc.setTextColor(0, 245, 255)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 12, y)
      y += 3
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(200, 200, 255)
      const lines = doc.splitTextToSize(body, pageWidth - 24)
      doc.text(lines, 12, y)
      y += lines.length * 3 + 4
    })

    y += 4
    doc.setTextColor(0, 255, 136)
    doc.setFont('helvetica', 'bold')
    doc.text('✓ CONTRATO ACEPTADO POR TODOS LOS MIEMBROS DEL EQUIPO', 12, y)
    y += 8

    // ── Criteria ──
    if (y > 230) { doc.addPage(); y = 15 }
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('4. CRITERIOS DE EVALUACIÓN', 10, y)
    y += 5
    doc.setDrawColor(0, 255, 136)
    doc.line(10, y, pageWidth - 10, y)
    y += 5

    const criterios = [
      ['(A) Organización', 'Estructura organizativa clara', 'SI', 'NO', 'SI'],
      ['(B) Sketchbook digital', 'Bocetos, storyboard, planimetría', 'SI', 'NO', 'SI'],
      ['(C) Caracterización', 'Personajes identificables', 'SI', 'SI', 'NO'],
      ['(D) Creatividad', 'Técnicas de ilustración', 'SI', 'NO', 'SI'],
      ['(E) Legibilidad', 'Contraste adecuado', 'SI', 'SI', 'SI'],
    ]

    doc.setFontSize(8)
    doc.setTextColor(123, 44, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('Criterio', 12, y)
    doc.text('Cuento', pageWidth - 55, y, { align: 'center' })
    doc.text('Infografía', pageWidth - 35, y, { align: 'center' })
    doc.text('Juego', pageWidth - 15, y, { align: 'center' })
    y += 4

    criterios.forEach(([crit, _desc, c, i, j]) => {
      doc.setTextColor(200, 200, 255)
      doc.setFont('helvetica', 'normal')
      doc.text(`${crit}`, 12, y)
      doc.setTextColor(c === 'SI' ? 0 : 255, c === 'SI' ? 255 : 100, c === 'SI' ? 136 : 100)
      doc.text(c, pageWidth - 55, y, { align: 'center' })
      doc.setTextColor(i === 'SI' ? 0 : 255, i === 'SI' ? 255 : 100, i === 'SI' ? 136 : 100)
      doc.text(i, pageWidth - 35, y, { align: 'center' })
      doc.setTextColor(j === 'SI' ? 0 : 255, j === 'SI' ? 255 : 100, j === 'SI' ? 136 : 100)
      doc.text(j, pageWidth - 15, y, { align: 'center' })
      y += 5
    })

    // ── Footer / Signatures ──
    if (y > 230) { doc.addPage(); y = 15 }
    y += 10
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('5. FIRMAS DIGITALES', 10, y)
    y += 5
    doc.setDrawColor(255, 255, 255)
    doc.line(10, y, pageWidth - 10, y)
    y += 6

    const colPositions = [15, 75, 135]
    let colIdx = 0
    estudiantes.forEach((est, i) => {
      if (colIdx === 0 && i > 0) y += 25
      const x = colPositions[colIdx]

      if (est.firma) {
        try { doc.addImage(est.firma, 'PNG', x, y, 40, 12, '', 'FAST') } catch { /* skip */ }
      }
      doc.setDrawColor(200, 200, 200)
      doc.line(x, y + 13, x + 45, y + 13)

      doc.setFontSize(7)
      doc.setTextColor(200, 200, 255)
      doc.setFont('helvetica', 'bold')
      doc.text(`${est.nombres} ${est.apellidos}`, x, y + 17)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`DNI: ${est.dni}`, x, y + 21)

      colIdx = (colIdx + 1) % 3
    })

    // ── Docente ──
    y += 30
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setDrawColor(0, 245, 255)
    doc.setLineWidth(0.5)
    doc.line(10, y, pageWidth - 10, y)
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(0, 245, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('Docente del Curso:', 10, y)
    doc.setTextColor(255, 255, 255)
    doc.text('Mg. Mario Quiroz Martinez', 50, y)
    y += 5
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text('Instituto de Educación Superior Público - Diseño & Comunicación', 10, y)
    y += 3
    doc.text('Curso: Proyecto Ilustrador 2026 | Semana 12', 10, y)
    y += 3
    doc.text(`Documento generado el: ${new Date().toLocaleDateString('es-PE')}`, 10, y)

    // ── Watermark ──
    const totalPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setTextColor(40, 40, 50)
      doc.setFontSize(50)
      doc.setFont('helvetica', 'bold')
      doc.text('CONFIDENCIAL', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 })
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 100)
      doc.text(`Pagina ${p} de ${totalPages} | IDC 2026 | Documento Oficial`, pageWidth / 2, pageHeight - 5, { align: 'center' })
    }

    doc.save(`formulario-estado-arte-${nombreEquipo.replace(/\s+/g, '-')}-2026.pdf`)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] grid-bg">
      {/* ─── HEADER ─── */}
      <header className="border-b border-[#7b2cff]/20 bg-[#0b0b0f]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-idc.png" alt="IDC" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <p className="text-[10px] text-[#e7e7ff]/40 font-[Orbitron]">INSTITUTO DE EDUCACION SUPERIOR PUBLICO</p>
              <p className="text-[10px] text-[#00f5ff] font-[Orbitron]">DISENO & COMUNICACION</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDemo(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00f5ff]/30 text-[#00f5ff] text-xs font-[Orbitron] hover:bg-[#00f5ff]/10 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" /> AYUDA
            </button>
            <Button onClick={generatePDF} className="bg-gradient-to-r from-[#ff2aa3] via-[#7b2cff] to-[#00f5ff] text-white text-xs font-bold font-[Orbitron] hover:opacity-90">
              <Printer className="w-3.5 h-3.5 mr-1" /> IMPRIMIR PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ─── TITLE ─── */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00f5ff]/20 bg-[#00f5ff]/5">
            <BookOpen className="w-3.5 h-3.5 text-[#00f5ff]" />
            <span className="text-[10px] text-[#00f5ff] font-[Orbitron] tracking-wider">CURSO PROYECTO ILUSTRADOR 2026</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black gradient-text-retro font-[Orbitron]">FORMULARIO DE ESTADO DE ARTE</h1>
          <p className="text-xs text-[#e7e7ff]/40 max-w-lg mx-auto">Primer informe del estado de arte de los Proyectos Finales de Curso. Complete todos los campos requeridos. Pasa el mouse sobre el icono <HelpCircle className="w-3 h-3 inline text-[#7b2cff]" /> para ver la ayuda de cada campo.</p>
        </section>

        {/* ─── DATOS GENERALES ─── */}
        <section className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#00f5ff]" />
            <h2 className="text-sm font-bold text-[#e7e7ff] font-[Orbitron]">DATOS GENERALES</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-[#e7e7ff]/60 flex items-center">
                Nombre del Equipo <span className="text-[#ff2aa3] ml-1">*</span>
                <HelpTooltip text={HELP.nombreEquipo} />
              </Label>
              <Input value={nombreEquipo} onChange={e => setNombreEquipo(e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-sm focus:border-[#00f5ff]" placeholder="Ej: Valor de la Amistad" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#e7e7ff]/60 flex items-center">
                Fecha <span className="text-[#ff2aa3] ml-1">*</span>
                <HelpTooltip text={HELP.fecha} />
              </Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-sm focus:border-[#00f5ff]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#e7e7ff]/60">Semana</Label>
              <Input value="12" readOnly className="bg-[#0b0b0f] border-[#7b2cff]/20 text-[#e7e7ff]/40 text-sm" />
            </div>
          </div>
        </section>

        {/* ─── ESTUDIANTES ─── */}
        <section className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#ff2aa3]" />
            <h2 className="text-sm font-bold text-[#e7e7ff] font-[Orbitron]">MIEMBROS DEL EQUIPO</h2>
            <span className="text-[10px] text-[#ff2aa3] ml-auto font-[Orbitron]">TODOS LOS CAMPOS SON OBLIGATORIOS</span>
          </div>

          <div className="space-y-4">
            {estudiantes.map((est, i) => (
              <div key={est.id} className="border border-[#7b2cff]/20 rounded-lg p-4 bg-[#0b0b0f]/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff2aa3] to-[#7b2cff] flex items-center justify-center text-[10px] font-bold text-white">{i + 1}</div>
                  <div>
                    <p className="text-xs font-semibold text-[#e7e7ff]">{est.rol}</p>
                    <p className="text-[10px] text-[#e7e7ff]/40">{est.responsabilidad}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[#e7e7ff]/50 flex items-center">
                      Nombres <span className="text-[#ff2aa3] ml-0.5">*</span>
                      <HelpTooltip text={HELP.nombres} />
                    </Label>
                    <Input value={est.nombres} onChange={e => updateEstudiante(est.id, 'nombres', e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-xs h-8 focus:border-[#00f5ff]" placeholder="Ej: Marcelo Gregorio" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[#e7e7ff]/50 flex items-center">
                      Apellidos <span className="text-[#ff2aa3] ml-0.5">*</span>
                      <HelpTooltip text={HELP.apellidos} />
                    </Label>
                    <Input value={est.apellidos} onChange={e => updateEstudiante(est.id, 'apellidos', e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-xs h-8 focus:border-[#00f5ff]" placeholder="Ej: Campos Nacido" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[#e7e7ff]/50 flex items-center">
                      DNI <span className="text-[#ff2aa3] ml-0.5">*</span>
                      <HelpTooltip text={HELP.dni} />
                    </Label>
                    <Input value={est.dni} onChange={e => updateEstudiante(est.id, 'dni', e.target.value.replace(/\D/g, '').slice(0, 8))} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-xs h-8 focus:border-[#00f5ff] mono" placeholder="12345678" maxLength={8} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[#e7e7ff]/50 flex items-center">
                      <Mail className="w-3 h-3 text-[#00f5ff] mr-0.5" /> Correo Institucional <span className="text-[#ff2aa3] ml-0.5">*</span>
                      <HelpTooltip text={HELP.correo} />
                    </Label>
                    <Input value={est.correo} onChange={e => updateEstudiante(est.id, 'correo', e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-xs h-8 focus:border-[#00f5ff]" placeholder="ejemplo@idcallao.edu.pe" type="email" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <SignaturePad value={est.firma} onChange={v => updateEstudiante(est.id, 'firma', v)} label="Firma Digital" estudianteId={est.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── PIEZAS ─── */}
        <section className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-[#ffe600]" />
            <h2 className="text-sm font-bold text-[#e7e7ff] font-[Orbitron]">PIEZAS GRAFICAS ELEGIDAS</h2>
          </div>
          <p className="text-xs text-[#e7e7ff]/40 mb-4">Sube las piezas graficas que presentaras para cada proyecto. Puedes agregar multiples piezas.</p>

          <div className="space-y-4">
            {piezas.map((pieza, i) => (
              <div key={pieza.id} className="border border-[#7b2cff]/20 rounded-lg p-4 bg-[#0b0b0f]/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#ffe600] font-[Orbitron]">PIEZA #{i + 1}</span>
                  {piezas.length > 1 && <button onClick={() => removePieza(pieza.id)} className="text-[#ff2aa3] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-[#e7e7ff]/50">Proyecto</Label>
                    <select value={pieza.tipo} onChange={e => updatePieza(pieza.id, 'tipo', e.target.value)} className="w-full h-8 bg-[#0b0b0f] border border-[#7b2cff]/30 rounded-md text-[#e7e7ff] text-xs px-2 focus:border-[#00f5ff] outline-none">
                      <option value="cuento">Cuento Infantil</option>
                      <option value="infografia">Infografia</option>
                      <option value="juego">Juego de Mesa</option>
                    </select>
                    <Label className="text-[10px] text-[#e7e7ff]/50 mt-2 block flex items-center">
                      Nombre de la pieza
                      <HelpTooltip text={HELP.piezaNombre} />
                    </Label>
                    <Input value={pieza.nombre} onChange={e => updatePieza(pieza.id, 'nombre', e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-xs h-8 focus:border-[#00f5ff]" placeholder="Ej: Portada del cuento" />
                  </div>
                  <div><ImageUpload onImageSelect={v => updatePieza(pieza.id, 'archivo', v)} preview={pieza.archivo} /></div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-[#e7e7ff]/50 flex items-center">
                      <Zap className="w-3 h-3 text-[#00f5ff] mr-1" /> Mejoras a implementar
                      <HelpTooltip text={HELP.piezaMejoras} />
                    </Label>
                    <Textarea value={pieza.mejoras} onChange={e => updatePieza(pieza.id, 'mejoras', e.target.value)} className="bg-[#0b0b0f] border-[#7b2cff]/30 text-[#e7e7ff] text-xs min-h-[140px] focus:border-[#00f5ff] resize-none" placeholder="Describe las mejoras que implementaras en esta pieza grafica..." />
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addPieza} variant="outline" className="w-full border-dashed border-[#7b2cff]/30 text-[#e7e7ff]/40 hover:text-[#00f5ff] hover:border-[#00f5ff]/50 text-xs font-[Orbitron]">
              <Plus className="w-3.5 h-3.5 mr-1" /> AGREGAR PIEZA
            </Button>
          </div>
        </section>

        {/* ─── CRITERIOS ─── */}
        <section className="retro-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-[#00ff88]" />
            <h2 className="text-sm font-bold text-[#e7e7ff] font-[Orbitron]">CRITERIOS DE EVALUACION</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-[#7b2cff]/30">
                <th className="text-left py-2 px-3 text-[#e7e7ff]/40 font-[Orbitron]">Criterio</th>
                <th className="text-left py-2 px-3 text-[#e7e7ff]/40 font-[Orbitron]">Descripcion</th>
                <th className="text-center py-2 px-3 text-[#e7e7ff]/40 font-[Orbitron]">Cuento</th>
                <th className="text-center py-2 px-3 text-[#e7e7ff]/40 font-[Orbitron]">Infografia</th>
                <th className="text-center py-2 px-3 text-[#e7e7ff]/40 font-[Orbitron]">Juego</th>
              </tr></thead>
              <tbody>
                {[
                  ['(A) Organizacion', 'Estructura organizativa clara con inicio, desarrollo y conclusion', true, false, true],
                  ['(B) Sketchbook digital', 'Bocetos, storyboard, planimetria y armonias de color', true, false, true],
                  ['(C) Caracterizacion', 'Personajes identificables con perfil psicologico', true, true, false],
                  ['(D) Creatividad', 'Tecnicas de ilustracion, planos y propiedad intelectual', true, false, true],
                  ['(E) Legibilidad', 'Contraste adecuado, sin interferencias visuales', true, true, true],
                ].map(([criterio, desc, cuento, info, juego], i) => (
                  <tr key={i} className="border-b border-[#7b2cff]/10 hover:bg-[#7b2cff]/5">
                    <td className="py-2 px-3 text-[#ff2aa3] font-semibold">{criterio}</td>
                    <td className="py-2 px-3 text-[#e7e7ff]/50">{desc}</td>
                    <td className="py-2 px-3 text-center">{cuento ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}</td>
                    <td className="py-2 px-3 text-center">{info ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}</td>
                    <td className="py-2 px-3 text-center">{juego ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── CONTRATO ─── */}
        <section className="retro-card p-6 border border-[#ff2aa3]/30">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#ff2aa3]" />
            <h2 className="text-sm font-bold text-[#ff2aa3] font-[Orbitron]">CONTRATO DE DERECHOS DE AUTOR</h2>
          </div>
          <div className="bg-[#ff2aa3]/5 border border-[#ff2aa3]/20 rounded-lg p-4 mb-4 space-y-3 text-xs text-[#e7e7ff]/70">
            <p><strong className="text-[#ff2aa3]">CLAUSULA 1 - PROPIEDAD INTELECTUAL COMPARTIDA:</strong> Los derechos de autor de todos los proyectos desarrollados en el curso de Proyecto Ilustrador 2026 pertenecen de manera <strong className="text-[#ffe600]">equitativa y conjunta</strong> a todos los miembros del equipo.</p>
            <p><strong className="text-[#00f5ff]">CLAUSULA 2 - REGISTRO EN PIEZAS GRAFICAS:</strong> Todas las piezas graficas presentadas <strong className="text-[#ffe600]">deben incluir el credito completo</strong> de todos los miembros del equipo en todas las piezas graficas presentadas.</p>
            <p><strong className="text-[#7b2cff]">CLAUSULA 3 - RENUNCIA AL EQUIPO:</strong> Si un miembro renuncia al equipo, debe presentar una <strong className="text-[#ffe600]">carta poder</strong> indicando que cede sus derechos de participacion <strong className="text-[#ff2aa3]">creativa</strong>, <strong className="text-[#00f5ff]">intelectual</strong> y <strong className="text-[#7b2cff]">funcional</strong> a los demas miembros del equipo.</p>
            <p><strong className="text-[#ffe600]">CLAUSULA 4 - DISTRIBUCION EQUITATIVA:</strong> Los beneficios y reconocimientos seran distribuidos de manera equitativa entre todos los miembros activos.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={contratoAceptado} onChange={e => setContratoAceptado(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#ff2aa3]" />
            <span className="text-xs text-[#e7e7ff]/60">Acepto los terminos del contrato de derechos de autor. Entiendo que los derechos de todos los proyectos pertenecen equitativamente a todos los miembros del equipo y que cualquier renuncia requiere una carta poder cediendo los derechos creativos, intelectuales y funcionales.</span>
          </label>
        </section>

        {/* ─── SUBMIT ─── */}
        <section className="text-center pb-8">
          <Button onClick={generatePDF} size="lg" className="bg-gradient-to-r from-[#ff2aa3] via-[#7b2cff] to-[#00f5ff] text-white font-bold font-[Orbitron] hover:opacity-90 px-8 py-6 text-base">
            <Printer className="w-5 h-5 mr-2" />
            IMPRIMIR PDF
          </Button>
          {submitted && <p className="mt-3 text-sm text-green-400 font-[Orbitron]"><CheckCircle className="w-4 h-4 inline mr-1" /> PDF generado exitosamente</p>}
          <p className="mt-2 text-[10px] text-[#e7e7ff]/20">Se generara un PDF oficial con marca de agua CONFIDENCIAL, firmas y atributos de seguridad</p>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[#7b2cff]/20 bg-[#0b0b0f] py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="section-divider mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div>
              <img src="/logo-idc.png" alt="IDC" className="h-8 w-auto mx-auto md:mx-0 mb-2" />
              <p className="text-[10px] text-[#e7e7ff]/30">Instituto de Educacion Superior Publico</p>
              <p className="text-[10px] text-[#e7e7ff]/30">Diseno & Comunicacion</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-[#e7e7ff]/40">
                <GraduationCap className="w-4 h-4 text-[#7b2cff]" />
                <span>Curso: Proyecto Ilustrador 2026</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-[#e7e7ff]/40">
                <Calendar className="w-4 h-4 text-[#7b2cff]" />
                <span>Semana 12</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-[#00f5ff]">
                <UserCheck className="w-4 h-4" />
                <span className="font-semibold">Docente: Mg. Mario Quiroz Martinez</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#e7e7ff]/20 mb-2 font-[Orbitron]">MIEMBROS DEL EQUIPO:</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1">
                {ESTUDIANTES_INICIAL.map(e => <span key={e.id} className="text-[10px] text-[#e7e7ff]/20">{e.rol}</span>)}
              </div>
            </div>
          </div>
          <div className="text-center mt-6 pt-4 border-t border-[#7b2cff]/10">
            <p className="text-[9px] text-[#e7e7ff]/15 font-[Orbitron]">PROYECTO ILUSTRADOR 2026 | IDC | TODOS LOS DERECHOS RESERVADOS</p>
          </div>
        </div>
      </footer>

      {/* ─── DEMO MODAL ─── */}
      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </div>
  )
}
