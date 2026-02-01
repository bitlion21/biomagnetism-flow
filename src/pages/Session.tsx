import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft, Save, CheckCircle2, Circle, Plus, Trash2, 
  Search, ChevronRight, AlertTriangle, User 
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { defaultClinicalChecklist } from '@/data/clinicalChecklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { SelectedPair, ClinicalChecklistItem, BiomagneticPair } from '@/types';
import { cn } from '@/lib/utils';

export function SessionPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const navigate = useNavigate();
  const { 
    getPatientById, 
    getUniquePointValues, 
    getPairsByPoint, 
    biomagneticPairs,
    addSession, 
    updateAppointment 
  } = useData();

  const patient = getPatientById(patientId || '');
  const uniquePoints = getUniquePointValues();

  // Session state
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [pointOpen, setPointOpen] = useState(false);
  const [availablePairs, setAvailablePairs] = useState<{ pair: BiomagneticPair; isPoint1: boolean }[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [checklist, setChecklist] = useState<ClinicalChecklistItem[]>(
    defaultClinicalChecklist.map(item => ({ ...item }))
  );
  const [freeNotes, setFreeNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [currentPairResult, setCurrentPairResult] = useState<BiomagneticPair | null>(null);

  // When point is selected, show available pairs (both from point1 and point2)
  const handlePointSelect = (point: string) => {
    setSelectedPoint(point);
    setPointOpen(false);
    const pairs = getPairsByPoint(point);
    const pairsWithInfo = pairs.map(pair => ({
      pair,
      isPoint1: pair.point1.toLowerCase() === point.toLowerCase()
    }));
    setAvailablePairs(pairsWithInfo);
    setCurrentPairResult(null);
  };

  // When a pair is selected, show its results
  const handlePairSelect = (pair: BiomagneticPair) => {
    setCurrentPairResult(pair);
  };

  // Add pair to session
  const addPairToSession = (pair: BiomagneticPair) => {
    if (selectedPairs.some(sp => sp.pairCode === pair.pairCode)) {
      toast.info('Este par ya está agregado');
      return;
    }
    setSelectedPairs(prev => [...prev, {
      pairCode: pair.pairCode,
      point1: pair.point1,
      point2: pair.point2,
    }]);
    toast.success(`Par ${pair.pairCode} agregado`);
  };

  // Remove pair from session
  const removePair = (pairCode: string) => {
    setSelectedPairs(prev => prev.filter(p => p.pairCode !== pairCode));
  };

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  // Save session
  const handleSave = () => {
    if (selectedPairs.length === 0) {
      toast.error('Agrega al menos un par biomagnético');
      return;
    }

    addSession({
      patientId: patientId!,
      appointmentId: appointmentId || undefined,
      date: new Date().toISOString(),
      summary: summary.trim() || undefined,
      selectedPairs,
      clinicalChecklist: checklist,
      freeNotes: freeNotes.trim() || undefined,
    });

    // Mark appointment as completed if exists
    if (appointmentId) {
      updateAppointment(appointmentId, { status: 'completed' });
    }

    toast.success('Sesión guardada correctamente');
    navigate(`/patients/${patientId}`);
  };

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Paciente no encontrado</h2>
        <Button onClick={() => navigate('/patients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a pacientes
        </Button>
      </div>
    );
  }

  // Check for warnings
  const hasWarnings = patient.hasPacemaker || patient.isPregnant || patient.chemotherapyOrRadiation;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sesión Terapéutica</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {patient.name ? `${patient.name} ${patient.lastName || ''}`.trim() : patient.phone}
              <span>•</span>
              <span>{format(new Date(), "d MMM yyyy", { locale: es })}</span>
            </div>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Sesión
        </Button>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Precauciones del paciente</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {patient.hasPacemaker && <Badge variant="destructive">Marcapasos</Badge>}
                  {patient.isPregnant && <Badge className="bg-warning/10 text-warning border-warning/30">Embarazo</Badge>}
                  {patient.chemotherapyOrRadiation && <Badge variant="destructive">Quimio/Radioterapia</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column - Pair selection */}
        <div className="space-y-4">
          {/* Point selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Seleccionar Punto</CardTitle>
            </CardHeader>
            <CardContent>
              <Popover open={pointOpen} onOpenChange={setPointOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedPoint || "Buscar punto..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar punto..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún punto.</CommandEmpty>
                      <CommandGroup>
                        {uniquePoints.map((point) => (
                          <CommandItem
                            key={point}
                            value={point}
                            onSelect={() => handlePointSelect(point)}
                          >
                            {point}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Pair selection */}
          {selectedPoint && (
            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle className="text-base">2. Seleccionar Par</CardTitle>
              </CardHeader>
              <CardContent>
                {availablePairs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay pares disponibles para este punto
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availablePairs.map(({ pair, isPoint1 }) => (
                      <button
                        key={pair.id}
                        onClick={() => handlePairSelect(pair)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors relative",
                          currentPairResult?.id === pair.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{pair.pairCode}</Badge>
                            <span className="font-medium text-sm">
                              {isPoint1 ? pair.point2 : pair.point1}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{pair.pathogen}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPoint1 && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-destructive text-destructive text-xs font-bold">
                              −
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pair result */}
          {currentPairResult && (
            <Card className="animate-fade-up border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Resultado del Par</CardTitle>
                  <Button size="sm" onClick={() => addPairToSession(currentPairResult)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-muted-foreground">Punto 1</p>
                    <p className="font-medium">{currentPairResult.point1}</p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-muted-foreground">Punto 2</p>
                    <p className="font-medium">{currentPairResult.point2}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Patógeno</p>
                    <p className="font-medium">{currentPairResult.pathogen || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <Badge variant="outline">{currentPairResult.type || 'No especificado'}</Badge>
                  </div>
                  {currentPairResult.symptoms && (
                    <div>
                      <p className="text-xs text-muted-foreground">Síntomas</p>
                      <p>{currentPairResult.symptoms}</p>
                    </div>
                  )}
                  {currentPairResult.recommendations && (
                    <div>
                      <p className="text-xs text-muted-foreground">Recomendaciones</p>
                      <p className="text-muted-foreground">{currentPairResult.recommendations}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Session details */}
        <div className="space-y-4">
          {/* Selected pairs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Pares Seleccionados
                {selectedPairs.length > 0 && (
                  <Badge variant="secondary">{selectedPairs.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPairs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecciona pares para agregarlos a la sesión
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedPairs.map((pair) => (
                    <div 
                      key={pair.pairCode}
                      className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <div>
                          <p className="font-medium text-sm">{pair.pairCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {pair.point1} ↔ {pair.point2}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removePair(pair.pairCode)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist Clínica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <span className={cn(
                      "text-sm",
                      item.checked && "text-muted-foreground line-through"
                    )}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas de Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="form-field">
                <Label htmlFor="summary">Resumen</Label>
                <Input
                  id="summary"
                  placeholder="Breve resumen de la sesión..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>
              <div className="form-field">
                <Label htmlFor="freeNotes">Notas adicionales</Label>
                <Textarea
                  id="freeNotes"
                  placeholder="Observaciones, recomendaciones, seguimiento..."
                  rows={4}
                  value={freeNotes}
                  onChange={(e) => setFreeNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
