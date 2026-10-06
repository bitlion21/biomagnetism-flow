import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, BookOpen, Calendar, Check,
  CircleHelp, ClipboardCheck, Clock3, FileClock, FileText, HeartPulse,
  History, Image, Lightbulb, Plus, Search, ShieldCheck, Stethoscope,
  Timer, Upload, UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FlowNode = ({ icon: Icon, title, detail, tone = 'teal' }: {
  icon: React.ElementType;
  title: string;
  detail: string;
  tone?: 'teal' | 'orange' | 'ink';
}) => (
  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
      tone === 'orange' ? 'bg-orange-100 text-orange-700' : tone === 'ink'
        ? 'bg-foreground/10 text-foreground' : 'bg-primary/10 text-primary'
    }`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-foreground">{title}</span>
      <span className="block text-xs leading-relaxed text-muted-foreground">{detail}</span>
    </span>
  </div>
);

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{number}</span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <header className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 gap-1.5"><CircleHelp className="h-3.5 w-3.5" /> Guía de uso</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">De la ficha a la sesión</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pacientes, pares, temporizadores e historial: una guía visual para el trabajo diario con Biomag.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/knowledge"><ArrowLeft className="mr-2 h-4 w-4" />Base de Conocimiento</Link>
          </Button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['01', 'Paciente', '#paciente'], ['02', 'Pares', '#pares'],
            ['03', 'Sesión', '#sesion'], ['04', 'Seguimiento', '#seguimiento'],
          ].map(([n, label, href]) => (
            <a key={n} href={href} className="rounded-lg border bg-background/80 px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-primary/5">
              <span className="mr-2 font-mono text-xs text-primary">{n}</span>{label}
            </a>
          ))}
        </div>
      </header>

      <section id="paciente" className="scroll-mt-6 space-y-4">
        <SectionHeading number="01" title="Prepara la ficha" description="Agenda, datos del paciente e información que conviene tener a mano." />
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-primary" />Antes de empezar</CardTitle>
              <CardDescription>Un recorrido breve hasta la sesión activa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <FlowNode icon={Calendar} title="Agenda" detail="Abre la cita del día" />
                <ArrowRight className="mx-auto my-0.5 h-4 w-4 rotate-90 text-muted-foreground sm:my-auto sm:rotate-0" />
                <FlowNode icon={UserRound} title="Paciente" detail="Revisa la ficha clínica" />
                <ArrowRight className="mx-auto my-0.5 h-4 w-4 rotate-90 text-muted-foreground sm:my-auto sm:rotate-0" />
                <FlowNode icon={Activity} title="Sesión" detail="Inicia el rastreo" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4 text-orange-600" />Dato práctico</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <p>En la ficha puedes anotar <strong className="text-foreground">Síntomas / Patologías</strong> y <strong className="text-foreground">Patologías Recurrentes</strong>.</p>
              <p>Durante la sesión, abre <strong className="text-foreground">Info → Información clínica</strong> para consultar estos datos sin salir del trabajo.</p>
              <p>También puedes consultar sesiones previas y los pares reservorio desde esa misma sección.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="pares" className="scroll-mt-6 space-y-4">
        <SectionHeading number="02" title="Encuentra y añade pares" description="Busca en la base o trabaja desde el flujo de rastreo de la sesión." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4 text-primary" />Dos formas de llegar a Pares Seleccionados</CardTitle>
            <CardDescription>El esquema resume las opciones disponibles dentro de una sesión.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4 text-primary" />Rastreo</div>
                <div className="flex flex-col gap-2">
                  <FlowNode icon={Search} title="1. Punto" detail="Elige o busca un punto" />
                  <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
                  <FlowNode icon={HeartPulse} title="2. Par" detail="Selecciona el par encontrado" />
                  <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="grid grid-cols-2 gap-2">
                    <FlowNode icon={Plus} title="Agregar" detail="Par del rastreo" />
                    <FlowNode icon={Activity} title="Par LOG" detail="Anótalo como lógico" tone="ink" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-orange-600" />Protocolos</div>
                <div className="flex min-h-[255px] flex-col justify-center gap-3">
                  <FlowNode icon={BookOpen} title="0. Protocolos" detail="Pulsa Ver para mostrar u ocultar la lista" tone="orange" />
                  <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
                  <FlowNode icon={Search} title="Pares por Protocolos" detail="Consulta número, par, grupo y tipo" />
                  <ArrowDown className="mx-auto h-4 w-4 text-muted-foreground" />
                  <FlowNode icon={Plus} title="Agregar" detail="El botón está junto al nombre del par" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-background p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Marcas de origen:</span>
              <Badge className="bg-success/10 text-success hover:bg-success/10"><Check className="mr-1 h-3 w-3" />Rastreo</Badge>
              <Badge variant="outline" className="text-foreground">✓ Protocolo</Badge>
              <Badge variant="outline" className="border-foreground text-foreground">LOG</Badge>
              <span>Así puedes reconocer cómo se añadió cada elemento.</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Image className="h-4 w-4 text-primary" />Consulta rápida de un par</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>En la base de conocimiento, busca por código, punto, nombre o síntomas. La búsqueda no distingue mayúsculas ni tildes. Puedes filtrar por patógeno y tipo.</p>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3">
                <Badge variant="secondary">Par</Badge><span className="text-foreground">Punto A ↔ Punto B</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs"><Image className="h-3.5 w-3.5" />Imagen</span>
                <span className="flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs"><Stethoscope className="h-3.5 w-3.5 text-primary" />Síntomas</span>
                <span className="flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs"><Lightbulb className="h-3.5 w-3.5 text-primary" />Recomendaciones</span>
              </div>
              <p>En una sesión también puedes importar pares de una sesión anterior. La ventana permite recorrer los pares y consultar sus datos; pulsa <strong className="text-foreground">Importar</strong> en cada ficha que quieras recuperar.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Datos clínicos claros</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>El botón naranja <strong className="text-foreground">Importar Pares Sesión Anterior</strong> copia los pares de la sesión previa del paciente para revisarlos al principio. Retira los que no correspondan antes de continuar.</p>
              <p><strong className="text-foreground">Par LOG</strong> identifica una anotación lógica; los pares de protocolo llevan una marca oscura. No representan la misma procedencia que un par añadido desde el rastreo.</p>
              <p>Las opciones de imagen, síntomas y recomendaciones se abren al pulsar sus iconos en la ficha del par.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="sesion" className="scroll-mt-6 space-y-4">
        <SectionHeading number="03" title="Trabaja dentro de la sesión" description="Temporizadores individuales, checklist y consultas sin perder el hilo." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Timer className="h-4 w-4 text-primary" />Cada ficha reúne el par y su crono</CardTitle>
            <CardDescription>Ilustración de los controles disponibles en Pares Seleccionados.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-xl border-2 border-primary/40 bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Par 24</Badge>
                <span className="font-semibold text-foreground">Hígado ↔ Riñón</span>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1 text-xs text-primary"><Image className="h-3.5 w-3.5" />Imagen</span>
              </div>
              <div className="my-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-5 w-5" /></span>
                  <span className="font-mono text-xl font-semibold tracking-wider text-foreground">08:42</span>
                  <span className="text-xs text-muted-foreground">En curso</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border text-sm">✓</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border text-sm">×</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border text-xs">✎</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border text-xs">▣</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-dashed pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-primary" />Sintomatología</span>
                <span className="inline-flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-primary" />Recomendaciones</span>
                <span className="inline-flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Imagen</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 font-semibold text-foreground"><Check className="h-4 w-4 text-success" />En marcha</div>
                <p className="text-xs leading-relaxed text-muted-foreground">✓ inicia o reanuda. La línea verde gruesa destaca el crono activo.</p>
              </div>
              <div className="rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/20">
                <div className="mb-1 flex items-center gap-2 font-semibold text-foreground"><Clock3 className="h-4 w-4 text-orange-600" />Tiempo terminado</div>
                <p className="text-xs leading-relaxed text-muted-foreground">Al llegar a cero, el borde naranja y la marca verde avisan que terminó.</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">× reinicia y pausa · lápiz edita la duración · papelera quita el elemento de la sesión.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-primary" />Añadir crono libre</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Pulsa <strong className="text-foreground">Añadir crono</strong> junto a Pares Seleccionados. Empieza en 12 minutos; pulsa su nombre para cambiarlo. No está asociado a ningún par.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ClipboardCheck className="h-4 w-4 text-primary" />Checklist y notas</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Marca el checklist clínico y guarda el resumen y las notas desde el final de la página de sesión.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4 text-primary" />Info en ventana</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Abre <strong className="text-foreground">Sesiones anteriores</strong>, <strong className="text-foreground">Información clínica</strong> o <strong className="text-foreground">Pares Reservorio</strong>. Filtra los reservorio por tipo y usa la X para cerrar.</CardContent>
          </Card>
        </div>
      </section>

      <section id="seguimiento" className="scroll-mt-6 space-y-4">
        <SectionHeading number="04" title="Guarda y vuelve a consultar" description="Al terminar, conserva el resumen de la visita para el siguiente encuentro." />
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-4">
              <FlowNode icon={ClipboardCheck} title="Checklist" detail="Revisa lo marcado" />
              <FlowNode icon={FileText} title="Notas" detail="Completa resumen y observaciones" />
              <FlowNode icon={Upload} title="Guardar sesión" detail="Guarda los cambios" />
              <FlowNode icon={FileClock} title="Próxima visita" detail="Abre el historial desde Info" />
            </div>
            <div className="mt-4 rounded-xl bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
              En <strong className="text-foreground">Sesiones anteriores</strong>, elige una visita para consultar sus pares. Puedes abrir sus imágenes, síntomas y recomendaciones, e importar pares individuales sin cerrar la ventana.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading number="05" title="Base de Conocimiento e importación" description="Consulta y mantén organizadas tus tablas de pares y protocolos." />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4 text-primary" />Busca con filtros</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Lista de pares</strong> permite buscar por código, punto, nombre o contenido, y abrir imagen, sintomatología y recomendaciones.</p>
              <p><strong className="text-foreground">Protocolos</strong> incluye búsqueda y filtros de grupo/tipo; desde ahí puedes añadir un par a la sesión.</p>
              <p>Las búsquedas de pares y puntos ignoran tildes y mayúsculas.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4 text-primary" />Importa una tabla Excel</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Ve a <strong className="text-foreground">Base de Conocimiento → Lista de pares → Importar</strong>.</p>
              <div className="flex flex-wrap gap-2"><Badge variant="secondary">01.Pares</Badge><Badge variant="secondary">02.Protocolos</Badge></div>
              <p>La hoja <strong className="text-foreground">01.Pares</strong> contiene pares y <strong className="text-foreground">02.Protocolos</strong> contiene protocolos. Las demás hojas se ignoran.</p>
              <p>En móvil, gira el dispositivo si una tabla ancha se lee mejor en horizontal.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading number="06" title="Acceso de terapeutas" description="Las cuentas nuevas necesitan autorización de un administrador." />
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">En la pantalla de acceso, el terapeuta elige usuario y contraseña y pulsa <strong className="text-foreground">Solicitar acceso</strong>. El administrador revisa la petición en <strong className="text-foreground">Usuarios</strong>, donde puede actualizar la lista, aprobarla, rechazarla o eliminarla. El acceso se habilita después de aprobarla.</p>
            <Badge variant="outline" className="w-fit shrink-0">Pendiente → Aprobado</Badge>
          </CardContent>
        </Card>
      </section>

      <footer className="rounded-xl border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        <p><strong className="text-foreground">Recorrido resumido</strong> · Paciente → Pares → Sesión → Guardar → Historial</p>
        <p className="mt-1">Los diagramas son una guía visual; los botones reales están en sus respectivas secciones de la app.</p>
      </footer>
    </div>
  );
}
