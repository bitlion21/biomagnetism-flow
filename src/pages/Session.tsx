import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  AlertTriangle,
  User,
  Check,
  X,
  Pencil,
  Image as ImageIcon,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    addSession,
    updateAppointment,
  } = useData();

  const patient = getPatientById(patientId || '');
  const uniquePoints = getUniquePointValues();

  // Session state
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [pointOpen, setPointOpen] = useState(false);
  const [availablePairs, setAvailablePairs] = useState<{ pair: BiomagneticPair; isPoint1: boolean }[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [pairTimers, setPairTimers] = useState<Record<string, { baseSeconds: number; remainingSeconds: number; isRunning: boolean }>>({});
  const [editingPairTimer, setEditingPairTimer] = useState<string | null>(null);
  const [editingTimerValue, setEditingTimerValue] = useState<string>('');
  const [checklist, setChecklist] = useState<ClinicalChecklistItem[]>(
    defaultClinicalChecklist.map(item => ({ ...item }))
  );
  const [freeNotes, setFreeNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [currentPairResult, setCurrentPairResult] = useState<BiomagneticPair | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogPairCode, setImageDialogPairCode] = useState<string | null>(null);

  const DEFAULT_TIMER_SECONDS = 12 * 60;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPairTimers(prev => {
        let updated = false;
        const next: typeof prev = {};
        for (const [pairCode, timer] of Object.entries(prev)) {
          if (!timer.isRunning) {
            next[pairCode] = timer;
            continue;
          }
          const remaining = Math.max(0, timer.remainingSeconds - 1);
          next[pairCode] = {
            ...timer,
            remainingSeconds: remaining,
            isRunning: remaining > 0 ? timer.isRunning : false,
          };
          updated = true;
        }
        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // When point is selected, show available pairs (both from point1 and point2)
  const handlePointSelect = (point: string) => {
    setSelectedPoint(point);
    setPointOpen(false);
    const pairs = getPairsByPoint(point);
    const pairsWithInfo = pairs.map(pair => ({
      pair,
      isPoint1: pair.point1.toLowerCase() === point.toLowerCase(),
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
    setPairTimers(prev => ({
      ...prev,
      [pair.pairCode]: prev[pair.pairCode] || {
        baseSeconds: DEFAULT_TIMER_SECONDS,
        remainingSeconds: DEFAULT_TIMER_SECONDS,
        isRunning: false,
      },
    }));
    toast.success(`Par ${pair.pairCode} agregado`);
  };

  // Remove pair from session
  const removePair = (pairCode: string) => {
    setSelectedPairs(prev => prev.filter(p => p.pairCode !== pairCode));
    setPairTimers(prev => {
      const next = { ...prev };
      delete next[pairCode];
      return next;
    });
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

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const parseTimerInput = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return null;
    if (/^\d+$/.test(normalized)) {
      const minutes = parseInt(normalized, 10);
      return minutes >= 0 ? minutes * 60 : null;
    }
    const match = normalized.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    if (Number.isNaN(minutes) || Number.isNaN(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
      return null;
    }
    return minutes * 60 + seconds;
  };

  const startEditingTimer = (pairCode: string, baseSeconds: number) => {
    setEditingPairTimer(pairCode);
    setEditingTimerValue(formatTimer(baseSeconds));
  };

  const cancelEditingTimer = () => {
    setEditingPairTimer(null);
    setEditingTimerValue('');
  };

  const commitEditingTimer = (pairCode: string, timer: { baseSeconds: number; remainingSeconds: number; isRunning: boolean }) => {
    const seconds = parseTimerInput(editingTimerValue);
    if (seconds === null) {
      toast.error('Formato inválido. Usa mm o mm:ss');
      return;
    }
    setPairTimers(prev => ({
      ...prev,
      [pairCode]: {
        baseSeconds: seconds,
        remainingSeconds: seconds,
        isRunning: false,
      },
    }));
    cancelEditingTimer();
  };

  const getPairImagePath = (pairCode: string) => {
    const match = pairCode.match(/\d+/);
    const number = match ? match[0] : pairCode;
    return `/pairs/${number}.png`;
  };

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
                          {isPoint1 ? (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-destructive text-destructive text-xs font-bold">
                              +
                            </span>
                          ) : (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-foreground text-foreground text-xs font-bold">
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
                  {selectedPairs.map((pair) => {
                    const timer = pairTimers[pair.pairCode] || {
                      baseSeconds: DEFAULT_TIMER_SECONDS,
                      remainingSeconds: DEFAULT_TIMER_SECONDS,
                      isRunning: false,
                    };
                    return (
                      <div
                        key={pair.pairCode}
                        className={cn(
                          "flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg",
                          timer.remainingSeconds === 0 && "border-l-8 border-l-success"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{pair.pairCode}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setImageDialogPairCode(pair.pairCode);
                                  setImageDialogOpen(true);
                                }}
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {pair.point1} ↔ {pair.point2}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {editingPairTimer === pair.pairCode ? (
                            <Input
                              value={editingTimerValue}
                              onChange={(e) => setEditingTimerValue(e.target.value)}
                              className="h-7 w-[72px] text-right font-mono text-sm"
                              inputMode="numeric"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitEditingTimer(pair.pairCode, timer);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEditingTimer();
                                }
                              }}
                            />
                          ) : (
                            <div className="text-right font-mono text-sm text-foreground min-w-[52px]">
                              {formatTimer(timer.remainingSeconds)}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success hover:text-success"
                              onClick={() => {
                                if (editingPairTimer === pair.pairCode) {
                                  const seconds = parseTimerInput(editingTimerValue);
                                  if (seconds === null) {
                                    toast.error('Formato inválido. Usa mm o mm:ss');
                                    return;
                                  }
                                  setPairTimers(prev => ({
                                    ...prev,
                                    [pair.pairCode]: {
                                      baseSeconds: seconds,
                                      remainingSeconds: seconds,
                                      isRunning: true,
                                    },
                                  }));
                                  cancelEditingTimer();
                                  return;
                                }
                                setPairTimers(prev => ({
                                  ...prev,
                                  [pair.pairCode]: {
                                    ...timer,
                                    remainingSeconds: timer.remainingSeconds === 0 ? timer.baseSeconds : timer.remainingSeconds,
                                    isRunning: true,
                                  },
                                }));
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setPairTimers(prev => ({
                                  ...prev,
                                  [pair.pairCode]: {
                                    ...timer,
                                    remainingSeconds: timer.baseSeconds,
                                    isRunning: false,
                                  },
                                }));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "text-muted-foreground hover:text-foreground",
                                editingPairTimer === pair.pairCode && "bg-muted/80 border border-border shadow-inner"
                              )}
                              onClick={() => {
                                if (editingPairTimer === pair.pairCode) {
                                  commitEditingTimer(pair.pairCode, timer);
                                  return;
                                }
                                startEditingTimer(pair.pairCode, timer.baseSeconds);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
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
                      </div>
                    );
                  })}
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
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Imagen del par {imageDialogPairCode}</DialogTitle>
          </DialogHeader>
          {imageDialogPairCode && (
            <div className="w-full overflow-hidden rounded-lg border bg-muted/10">
              <img
                src={getPairImagePath(imageDialogPairCode)}
                alt={`Imagen del par ${imageDialogPairCode}`}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
