import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, HeartPulse, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HelpPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ayuda</h1>
          <p className="text-muted-foreground">Guía rápida para usar la app de biomagnetismo</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/knowledge">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Base de Conocimiento
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              1. Agenda
            </CardTitle>
            <CardDescription>Crea y organiza citas</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Registra las citas diarias y selecciona al paciente para iniciar una sesión.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-primary" />
              2. Pacientes
            </CardTitle>
            <CardDescription>Ficha clínica e historial</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Completa datos, precauciones y revisa sesiones anteriores antes de atender.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              3. Base de Conocimiento
            </CardTitle>
            <CardDescription>Pares, protocolos y afecciones</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Busca pares, importa tablas Excel y consulta protocolos para apoyo terapéutico.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importar datos (Excel)
          </CardTitle>
          <CardDescription>
            La importación principal se hace desde Base de Conocimiento → Lista de pares → Importar
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Usa un archivo Excel con estas hojas:
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">01.Pares</Badge>
              <Badge variant="secondary">02.Protocolos</Badge>
            </div>
            <p className="text-muted-foreground">
              La app importa los pares desde <strong>01.Pares</strong> y los protocolos desde <strong>02.Protocolos</strong>.
              Las demás hojas se ignoran.
            </p>
            <p className="text-muted-foreground">
              Después puedes usar búsqueda sin acentos y filtros por grupo/tipo en la pestaña de protocolos.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/10 p-2">
            <img
              src="/templates/temporal/master.png"
              alt="Plantilla anatómica usada como referencia visual en la app"
              className="w-full h-auto rounded-md object-contain"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cómo usar Lista de pares</CardTitle>
            <CardDescription>Búsqueda, filtros y consulta visual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Abre <strong>Base de Conocimiento</strong>.</li>
              <li>Usa la barra de búsqueda para código, puntos, nombre o síntomas.</li>
              <li>Filtra por patógeno y tipo si quieres reducir resultados.</li>
              <li>Usa el icono de imagen para ver la referencia visual del par.</li>
            </ol>
            <div className="rounded-lg border bg-muted/10 p-2">
              <img
                src="/images/pares/1.png"
                alt="Ejemplo de imagen de un par biomagnético"
                className="w-full h-auto rounded-md object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cómo usar Protocolos</CardTitle>
            <CardDescription>Filtrar por tipo y grupo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              En la pestaña <strong>Protocolos</strong> puedes:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Buscar por número, nombre del par/enfermedad o texto del registro.</li>
              <li>Filtrar por tipo: <strong>Todos</strong>, <strong>Básicos</strong> o <strong>x enfermedad</strong>.</li>
              <li>Filtrar por grupo (lista optimizada para mostrar grupos de protocolos básicos).</li>
            </ol>
            <div className="rounded-lg border bg-muted/10 p-2">
              <img
                src="/templates/master/CU1.cuerpo.frontal.png"
                alt="Referencia anatómica frontal"
                className="w-full h-auto rounded-md object-contain"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temporizadores dentro de una sesión</CardTitle>
          <CardDescription>Control de tiempo por cada par seleccionado</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cuando agregas un par en la sesión, aparece en <strong>Pares Seleccionados</strong> con su propio temporizador.
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Pulsa <strong>✓</strong> para iniciar o reanudar la cuenta regresiva.
              </li>
              <li>
                Pulsa <strong>X</strong> para reiniciar el temporizador al tiempo base y dejarlo en pausa.
              </li>
              <li>
                Pulsa <strong>lápiz</strong> para editar el tiempo del par.
              </li>
              <li>
                Puedes escribir el tiempo en formato <strong>mm</strong> o <strong>mm:ss</strong> (ejemplo: <code>15</code> o <code>12:30</code>).
              </li>
              <li>
                Pulsa <strong>Enter</strong> para guardar el valor editado o <strong>Esc</strong> para cancelar.
              </li>
              <li>
                Cuando llega a <strong>00:00</strong>, el par queda marcado visualmente y puedes volver a iniciarlo con <strong>✓</strong>.
              </li>
            </ol>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/10 p-4">
              <p className="text-sm font-medium text-foreground mb-2">Resumen rápido de botones</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>✓</strong> Iniciar / reanudar</p>
                <p><strong>X</strong> Reiniciar / pausar</p>
                <p><strong>Lápiz</strong> Editar duración</p>
                <p><strong>Papelera</strong> Quitar el par de la sesión</p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/10 p-2">
              <img
                src="/templates/master/CU2.cuerpo.posterior.png"
                alt="Referencia visual para trabajo con pares durante una sesión"
                className="w-full h-auto rounded-md object-contain"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flujo recomendado de trabajo</CardTitle>
          <CardDescription>Uso diario sugerido</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          1. Registra/ubica al paciente.
          <br />
          2. Crea o abre la cita en Agenda.
          <br />
          3. Inicia la sesión terapéutica.
          <br />
          4. Consulta pares/protocolos en Base de Conocimiento.
          <br />
          5. Añade los pares y usa el temporizador.
          <br />
          6. Guarda la sesión con sus correspondientes notas.
        </CardContent>
      </Card>
    </div>
  );
}
