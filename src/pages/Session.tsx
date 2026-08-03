import React, { useMemo, useState, useEffect } from 'react';
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
  Stethoscope,
  Lightbulb,
  History,
  FileText,
  TimerReset,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PairInfoDialog } from '@/components/knowledge/PairInfoDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { SelectedPair, ClinicalChecklistItem, BiomagneticPair, ProtocolItem } from '@/types';
import { cn } from '@/lib/utils';
import { getPairImageLabel, getPairNumber } from '@/lib/pairImage';

type PairTimerState = {
  baseSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  endsAt?: number;
};

export function SessionPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const sessionId = searchParams.get('sessionId');
  const navigate = useNavigate();
  const {
    getPatientById,
    getUniquePointValues,
    getPairsByPoint,
    biomagneticPairs,
    protocolItems,
    sessions,
    addSession,
    updateSession,
    updateAppointment,
  } = useData();

  const patient = getPatientById(patientId || '');
  const existingSession = sessionId
    ? sessions.find(session => session.id === sessionId && session.patientId === patientId)
    : undefined;
  const uniquePoints = getUniquePointValues();

  // Session state
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [pointOpen, setPointOpen] = useState(false);
  const [availablePairs, setAvailablePairs] = useState<{ pair: BiomagneticPair; isPoint1: boolean }[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<SelectedPair[]>([]);
  const [pairTimers, setPairTimers] = useState<Record<string, PairTimerState>>({});
  const [editingPairTimer, setEditingPairTimer] = useState<string | null>(null);
  const [editingTimerValue, setEditingTimerValue] = useState<string>('');
  const [editingPairLabel, setEditingPairLabel] = useState<string | null>(null);
  const [editingPairLabelValue, setEditingPairLabelValue] = useState('');
  const [checklist, setChecklist] = useState<ClinicalChecklistItem[]>(
    defaultClinicalChecklist.map(item => ({ ...item }))
  );
  const [freeNotes, setFreeNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [currentPairResult, setCurrentPairResult] = useState<BiomagneticPair | null>(null);
  const [protocolsVisible, setProtocolsVisible] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogPair, setImageDialogPair] = useState<SelectedPair | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogType, setInfoDialogType] = useState<'symptoms' | 'recommendations'>('symptoms');
  const [infoDialogPair, setInfoDialogPair] = useState<BiomagneticPair | null>(null);
  const [sessionInfoOpen, setSessionInfoOpen] = useState(false);
  const [sessionInfoView, setSessionInfoView] = useState<'history' | 'clinical' | 'reservoir'>('history');
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null);
  const [reservoirTypeFilter, setReservoirTypeFilter] = useState<string>('all');

  const DEFAULT_TIMER_SECONDS = 12 * 60;
  const generateSelectedPairId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const previousSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.patientId === patientId && session.id !== existingSession?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [existingSession?.id, patientId, sessions]
  );
  const latestPreviousSession = previousSessions[0];
  const selectedHistorySession = previousSessions.find((session) => session.id === selectedHistorySessionId) || null;
  const uniqueReservoirTypes = useMemo(
    () => [...new Set(biomagneticPairs.map((pair) => pair.type).filter(Boolean))].sort(),
    [biomagneticPairs]
  );
  const filteredReservoirPairs = useMemo(
    () =>
      biomagneticPairs.filter((pair) =>
        reservoirTypeFilter === 'all' ? true : pair.type === reservoirTypeFilter
      ),
    [biomagneticPairs, reservoirTypeFilter]
  );

  const getPairTimerState = (overrides?: Partial<PairTimerState>): PairTimerState => ({
    baseSeconds: DEFAULT_TIMER_SECONDS,
    remainingSeconds: DEFAULT_TIMER_SECONDS,
    isRunning: false,
    ...overrides,
  });

  const getRemainingSeconds = (timer: PairTimerState, now = Date.now()) => {
    if (!timer.isRunning || !timer.endsAt) {
      return timer.remainingSeconds;
    }
    return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  };

  useEffect(() => {
    if (!existingSession) return;

    setSelectedPairs(
      (existingSession.selectedPairs || []).map((pair) => ({
        ...pair,
        id: pair.id || pair.pairCode || generateSelectedPairId(),
        kind: pair.kind || (pair.source === 'timer' ? 'timer' : 'pair'),
      }))
    );
    setChecklist(
      existingSession.clinicalChecklist?.length
        ? existingSession.clinicalChecklist
        : defaultClinicalChecklist.map(item => ({ ...item }))
    );
    setFreeNotes(existingSession.freeNotes || '');
    setSummary(existingSession.summary || '');
    setPairTimers(
      (existingSession.selectedPairs || []).reduce<Record<string, PairTimerState>>(
        (acc, pair) => {
          acc[pair.id || pair.pairCode] = getPairTimerState();
          return acc;
        },
        {}
      )
    );
  }, [DEFAULT_TIMER_SECONDS, existingSession]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setPairTimers(prev => {
        let updated = false;
        const next: typeof prev = {};
        for (const [pairCode, timer] of Object.entries(prev)) {
          if (!timer.isRunning) {
            next[pairCode] = timer;
            continue;
          }
          const remaining = getRemainingSeconds(timer, now);
          next[pairCode] = {
            ...timer,
            remainingSeconds: remaining,
            isRunning: remaining > 0,
            endsAt: remaining > 0 ? timer.endsAt : undefined,
          };
          if (
            remaining !== timer.remainingSeconds ||
            (remaining === 0 && timer.isRunning)
          ) {
            updated = true;
          }
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

  const addPairToSession = (
    pair: BiomagneticPair,
    options?: { source?: SelectedPair['source']; resetSelectors?: boolean }
  ) => {
    if (selectedPairs.some(sp => sp.kind !== 'timer' && sp.pairCode === pair.pairCode)) {
      toast.info('Este par ya está agregado');
      return;
    }
    const source = options?.source || 'manual';
    const pairId = generateSelectedPairId();
    setSelectedPairs(prev => [...prev, {
      id: pairId,
      pairCode: pair.pairCode,
      point1: pair.point1,
      point2: pair.point2,
      kind: 'pair',
      source,
    }]);
    setPairTimers(prev => ({
      ...prev,
      [pairId]: prev[pairId] || getPairTimerState(),
    }));
    if (options?.resetSelectors ?? true) {
      setSelectedPoint('');
      setAvailablePairs([]);
      setCurrentPairResult(null);
    }
    toast.success(`Par ${pair.pairCode} agregado`);
  };

  const addStandaloneTimer = () => {
    const timerId = generateSelectedPairId();
    const timerIndex = selectedPairs.filter((pair) => pair.kind === 'timer').length + 1;
    setSelectedPairs((prev) => [
      ...prev,
      {
        id: timerId,
        pairCode: `CRONO-${timerIndex}`,
        point1: '',
        point2: '',
        label: `Crono ${timerIndex}`,
        kind: 'timer',
        source: 'timer',
      },
    ]);
    setPairTimers((prev) => ({
      ...prev,
      [timerId]: getPairTimerState(),
    }));
    toast.success('Crono agregado');
  };

  const importHistoricalPair = (pair: SelectedPair) => {
    if ((pair.kind || 'pair') === 'timer') {
      return;
    }

    if (selectedPairs.some((item) => item.kind !== 'timer' && item.pairCode === pair.pairCode)) {
      return;
    }

    const pairId = generateSelectedPairId();
    setSelectedPairs((prev) => [
      ...prev,
      {
        ...pair,
        id: pairId,
        kind: pair.kind || 'pair',
      },
    ]);
    setPairTimers((prev) => ({
      ...prev,
      [pairId]: getPairTimerState(),
    }));
    toast.success(`Par ${pair.label || pair.pairCode} importado`);
  };

  const isHistoricalPairImported = (pair: SelectedPair) =>
    selectedPairs.some((item) => item.kind !== 'timer' && item.pairCode === pair.pairCode);

  const importReservoirPair = (pair: BiomagneticPair) => {
    if (selectedPairs.some((item) => item.kind !== 'timer' && item.pairCode === pair.pairCode)) {
      return;
    }
    addPairToSession(pair, { resetSelectors: false });
  };

  const isReservoirPairImported = (pair: BiomagneticPair) =>
    selectedPairs.some((item) => item.kind !== 'timer' && item.pairCode === pair.pairCode);

  const importPreviousSessionPairs = () => {
    if (!latestPreviousSession) {
      toast.info('No hay una sesión anterior para importar');
      return;
    }

    const existingCodes = new Set(
      selectedPairs.filter((pair) => pair.kind !== 'timer').map((pair) => pair.pairCode)
    );

    const importedPairs = latestPreviousSession.selectedPairs
      .filter((pair) => (pair.kind || 'pair') !== 'timer')
      .filter((pair) => !existingCodes.has(pair.pairCode))
      .map((pair) => ({
        ...pair,
        id: generateSelectedPairId(),
        kind: pair.kind || 'pair',
      }));

    if (importedPairs.length === 0) {
      toast.info('La sesión anterior no tiene pares nuevos para importar');
      return;
    }

    setSelectedPairs((prev) => [...importedPairs, ...prev]);
    setPairTimers((prev) => {
      const next = { ...prev };
      importedPairs.forEach((pair) => {
        if (pair.id) {
          next[pair.id] = getPairTimerState();
        }
      });
      return next;
    });
    toast.success(`Importados ${importedPairs.length} pares de la sesión anterior`);
  };

  // Remove pair from session
  const removePair = (pairId: string) => {
    setSelectedPairs(prev => prev.filter(p => (p.id || p.pairCode) !== pairId));
    setPairTimers(prev => {
      const next = { ...prev };
      delete next[pairId];
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

    if (existingSession) {
      updateSession(existingSession.id, {
        appointmentId: existingSession.appointmentId || appointmentId || undefined,
        date: existingSession.date,
        summary: summary.trim() || undefined,
        selectedPairs,
        clinicalChecklist: checklist,
        freeNotes: freeNotes.trim() || undefined,
      });
    } else {
      addSession({
        patientId: patientId!,
        appointmentId: appointmentId || undefined,
        date: new Date().toISOString(),
        summary: summary.trim() || undefined,
        selectedPairs,
        clinicalChecklist: checklist,
        freeNotes: freeNotes.trim() || undefined,
      });
    }

    // Mark appointment as completed if exists
    if (appointmentId) {
      updateAppointment(appointmentId, { status: 'completed' });
    }

    toast.success(existingSession ? 'Sesión actualizada correctamente' : 'Sesión guardada correctamente');
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

  const startEditingPairLabel = (pair: SelectedPair) => {
    const pairKey = pair.id || pair.pairCode;
    setEditingPairLabel(pairKey);
    setEditingPairLabelValue(pair.label || pair.pairCode);
  };

  const cancelEditingPairLabel = () => {
    setEditingPairLabel(null);
    setEditingPairLabelValue('');
  };

  const commitEditingPairLabel = (pairKey: string) => {
    const nextLabel = editingPairLabelValue.trim();
    if (!nextLabel) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setSelectedPairs((prev) =>
      prev.map((pair) =>
        (pair.id || pair.pairCode) === pairKey
          ? {
              ...pair,
              label: nextLabel,
            }
          : pair
      )
    );
    cancelEditingPairLabel();
  };

  const commitEditingTimer = (pairCode: string) => {
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
        endsAt: undefined,
      },
    }));
    cancelEditingTimer();
  };

  const getPairImagePath = (pairCode: string) => {
    return `/images/pares/${getPairNumber(pairCode)}.png`;
  };

  const getKnowledgePair = (selectedPair: SelectedPair) =>
    biomagneticPairs.find(pair => pair.pairCode === selectedPair.pairCode);

  const getHistoricalCardKey = (sessionKey: string, pair: SelectedPair) =>
    `${sessionKey}:${pair.id || pair.pairCode}:${pair.source || 'manual'}`;

  const getProtocolNumber = (item: ProtocolItem) =>
    String(item.columns[0] || '')
      .trim()
      .match(/\d+/)?.[0] || '';

  const resolveProtocolPair = (item: ProtocolItem) => {
    const protocolNumber = getProtocolNumber(item);
    if (!protocolNumber) return undefined;

    return biomagneticPairs.find((pair) => {
      const pairNumber = getPairNumber(pair.pairCode);
      return pairNumber === protocolNumber || pair.pairCode.trim().toLowerCase() === protocolNumber.toLowerCase();
    });
  };

  const handleShowInfo = (selectedPair: SelectedPair, type: 'symptoms' | 'recommendations') => {
    const pair = getKnowledgePair(selectedPair);
    if (!pair) {
      toast.error('No se encontró este par en la base de conocimiento');
      return;
    }
    setInfoDialogPair(pair);
    setInfoDialogType(type);
    setInfoDialogOpen(true);
  };

  return (
    <TooltipProvider>
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
              <span>
                {format(new Date(existingSession?.date || new Date()), "d MMM yyyy", { locale: es })}
              </span>
              {existingSession && (
                <>
                  <span>•</span>
                  <span>Detalle / edición</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            onClick={importPreviousSessionPairs}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={!latestPreviousSession}
          >
            <History className="w-4 h-4 mr-2" />
            Importar Pares Sesión Anterior
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {existingSession ? 'Guardar cambios' : 'Guardar Sesión'}
          </Button>
        </div>
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
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span>0. Protocolos</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProtocolsVisible(prev => !prev);
                  }}
                >
                  {protocolsVisible ? 'Ocultar' : 'Ver'}
                </Button>
              </CardTitle>
            </CardHeader>
          </Card>

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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPairToSession(currentPairResult, { source: 'logical' })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Par LOG
                    </Button>
                    <Button size="sm" onClick={() => addPairToSession(currentPairResult)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
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

          {protocolsVisible && (
            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle className="text-base">Pares por Protocolos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {protocolItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay protocolos cargados
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Par</TableHead>
                            <TableHead>Grupo</TableHead>
                            <TableHead>Tipo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {protocolItems.map((item) => {
                            const pair = resolveProtocolPair(item);
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.columns[0] || '-'}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  <div className="flex items-center justify-between gap-3">
                                    <span>{item.columns[1] || '-'}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="shrink-0"
                                      onClick={() => pair && addPairToSession(pair, { source: 'protocol', resetSelectors: false })}
                                      disabled={!pair}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Agregar
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>{item.group || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.protocolCategory ? (
                                      <Badge variant="secondary">{item.protocolCategory}</Badge>
                                    ) : '-'}
                                    {!pair && (
                                      <Badge variant="outline">Sin par vinculado</Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Session details */}
        <div className="space-y-4">
          {/* Selected pairs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  Pares Seleccionados
                  {selectedPairs.length > 0 && (
                    <Badge variant="secondary">{selectedPairs.length}</Badge>
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={addStandaloneTimer}>
                  <TimerReset className="w-4 h-4 mr-2" />
                  Añadir crono
                </Button>
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
                    const pairKey = pair.id || pair.pairCode;
                    const timer = pairTimers[pairKey] || getPairTimerState();
                    return (
                      <div
                        key={pairKey}
                        className={cn(
                          "flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg",
                          timer.isRunning && "border-4 border-success/50",
                          timer.remainingSeconds === 0 && "border-4 border-warning",
                          timer.remainingSeconds === 0 && "border-l-8 border-l-success"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {pair.source === 'logical' ? (
                            <div className="w-8 shrink-0 text-center text-xs font-semibold text-foreground">
                              LOG
                            </div>
                          ) : (
                            <CheckCircle2
                              className={cn(
                                "w-5 h-5 shrink-0",
                                pair.source === 'protocol' ? "text-foreground" : "text-success"
                              )}
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              {pair.kind === 'timer' && editingPairLabel === pairKey ? (
                                <Input
                                  value={editingPairLabelValue}
                                  onChange={(e) => setEditingPairLabelValue(e.target.value)}
                                  className="h-7 w-[150px] text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      commitEditingPairLabel(pairKey);
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelEditingPairLabel();
                                    }
                                  }}
                                  onBlur={() => commitEditingPairLabel(pairKey)}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  className={cn(
                                    "font-medium text-sm text-left",
                                    pair.kind === 'timer' && "cursor-text hover:text-primary transition-colors"
                                  )}
                                  onClick={() => {
                                    if (pair.kind === 'timer') {
                                      startEditingPairLabel(pair);
                                    }
                                  }}
                                >
                                  {pair.label || pair.pairCode}
                                </button>
                              )}
                              {pair.kind !== 'timer' && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-primary hover:text-primary"
                                        onClick={() => handleShowInfo(pair, 'symptoms')}
                                      >
                                        <Stethoscope className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Sintomatología</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-primary hover:text-primary"
                                        onClick={() => handleShowInfo(pair, 'recommendations')}
                                      >
                                        <Lightbulb className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Recomendaciones</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                          setImageDialogPair(pair);
                                          setImageDialogOpen(true);
                                        }}
                                      >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver imagen</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {pair.kind === 'timer' ? 'Crono libre' : `${pair.point1} ↔ ${pair.point2}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {editingPairTimer === pairKey ? (
                            <Input
                              value={editingTimerValue}
                              onChange={(e) => setEditingTimerValue(e.target.value)}
                              className="h-7 w-[72px] text-right font-mono text-sm"
                              inputMode="numeric"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitEditingTimer(pairKey);
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
                                if (editingPairTimer === pairKey) {
                                  const seconds = parseTimerInput(editingTimerValue);
                                  if (seconds === null) {
                                    toast.error('Formato inválido. Usa mm o mm:ss');
                                    return;
                                  }
                                  setPairTimers(prev => ({
                                    ...prev,
                                    [pairKey]: {
                                      baseSeconds: seconds,
                                      remainingSeconds: seconds,
                                      isRunning: true,
                                      endsAt: Date.now() + (seconds * 1000),
                                    },
                                  }));
                                  cancelEditingTimer();
                                  return;
                                }
                                const remainingSeconds = timer.remainingSeconds === 0
                                  ? timer.baseSeconds
                                  : getRemainingSeconds(timer);
                                setPairTimers(prev => ({
                                  ...prev,
                                  [pairKey]: {
                                    ...timer,
                                    remainingSeconds,
                                    isRunning: true,
                                    endsAt: Date.now() + (remainingSeconds * 1000),
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
                                  [pairKey]: {
                                    ...timer,
                                    remainingSeconds: timer.baseSeconds,
                                    isRunning: false,
                                    endsAt: undefined,
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
                                editingPairTimer === pairKey && "bg-muted/80 border border-border shadow-inner"
                              )}
                              onClick={() => {
                                if (editingPairTimer === pairKey) {
                                  commitEditingTimer(pairKey);
                                  return;
                                }
                                startEditingTimer(pairKey, timer.baseSeconds);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePair(pairKey)}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setSessionInfoView('history');
                  setSelectedHistorySessionId(null);
                  setSessionInfoOpen(true);
                }}
              >
                <History className="w-4 h-4 mr-2" />
                Sesiones anteriores
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setSessionInfoView('clinical');
                  setSelectedHistorySessionId(null);
                  setSessionInfoOpen(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Información clínica
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setSessionInfoView('reservoir');
                  setSelectedHistorySessionId(null);
                  setSessionInfoOpen(true);
                }}
              >
                <Stethoscope className="w-4 h-4 mr-2" />
                Pares Reservorio
              </Button>
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
        {infoDialogPair && (
          <PairInfoDialog
            open={infoDialogOpen}
            onClose={() => setInfoDialogOpen(false)}
            pairCode={infoDialogPair.pairCode}
            type={infoDialogType}
            content={infoDialogType === 'symptoms'
              ? (infoDialogPair.symptoms || '')
              : (infoDialogPair.recommendations || '')
            }
          />
        )}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {imageDialogPair
                  ? getPairImageLabel(imageDialogPair.pairCode, imageDialogPair.point1, imageDialogPair.point2)
                  : 'Imagen del par'}
              </DialogTitle>
            </DialogHeader>
            {imageDialogPair && (
              <div className="w-full overflow-hidden rounded-lg border bg-muted/10">
                <img
                  src={getPairImagePath(imageDialogPair.pairCode)}
                  alt={getPairImageLabel(imageDialogPair.pairCode, imageDialogPair.point1, imageDialogPair.point2)}
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Dialog
          open={sessionInfoOpen}
          onOpenChange={(open) => {
            setSessionInfoOpen(open);
            if (!open) {
              setSelectedHistorySessionId(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pr-10">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  {sessionInfoView === 'history' && selectedHistorySession && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setSelectedHistorySessionId(null)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Volver a sesiones
                    </Button>
                  )}
                  <DialogTitle>
                    {sessionInfoView === 'history'
                      ? (selectedHistorySession ? 'Pares de la sesión' : 'Sesiones anteriores')
                      : sessionInfoView === 'clinical'
                        ? 'Información clínica del paciente'
                        : 'Pares Reservorio'}
                  </DialogTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    setSelectedHistorySessionId(null);
                    setSessionInfoOpen(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>
            {sessionInfoView === 'history' ? (
              selectedHistorySession ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="font-medium">
                      {format(new Date(selectedHistorySession.date), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedHistorySession.selectedPairs.filter((pair) => (pair.kind || 'pair') !== 'timer').length} pares en esta sesión
                    </p>
                  </div>
                  {selectedHistorySession.selectedPairs.filter((pair) => (pair.kind || 'pair') !== 'timer').length === 0 ? (
                    <p className="text-sm text-muted-foreground">Esta sesión no tiene pares importables.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedHistorySession.selectedPairs
                        .filter((pair) => (pair.kind || 'pair') !== 'timer')
                        .map((pair) => {
                          const imported = isHistoricalPairImported(pair);
                          return (
                            <div
                              key={getHistoricalCardKey(selectedHistorySession.id, pair)}
                              className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {pair.source === 'logical' ? (
                                  <div className="w-8 shrink-0 text-center text-xs font-semibold text-foreground">
                                    LOG
                                  </div>
                                ) : (
                                  <CheckCircle2
                                    className={cn(
                                      "w-5 h-5 shrink-0",
                                      pair.source === 'protocol' ? "text-foreground" : "text-success"
                                    )}
                                  />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{pair.label || pair.pairCode}</p>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-primary hover:text-primary"
                                          onClick={() => handleShowInfo(pair, 'symptoms')}
                                        >
                                          <Stethoscope className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Sintomatología</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-primary hover:text-primary"
                                          onClick={() => handleShowInfo(pair, 'recommendations')}
                                        >
                                          <Lightbulb className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Recomendaciones</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                          onClick={() => {
                                            setImageDialogPair(pair);
                                            setImageDialogOpen(true);
                                          }}
                                        >
                                          <ImageIcon className="w-3.5 h-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Ver imagen</TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {pair.point1} ↔ {pair.point2}
                                  </p>
                                </div>
                              </div>
                              {imported ? (
                                <span className="text-sm font-medium text-muted-foreground">Importado</span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => importHistoricalPair(pair)}
                                >
                                  Importar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : previousSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este paciente no tiene sesiones anteriores.</p>
              ) : (
                <div className="space-y-3">
                  {previousSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/20"
                      onClick={() => setSelectedHistorySessionId(session.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">
                            {format(new Date(session.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <Badge variant="secondary">{session.selectedPairs.length} elementos</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {session.selectedPairs.filter((pair) => (pair.kind || 'pair') !== 'timer').map((pair) => (
                            <Badge key={pair.id || `${session.id}-${pair.pairCode}`} variant="outline">
                              {pair.label || pair.pairCode}
                            </Badge>
                          ))}
                        </div>
                        {session.summary && (
                          <div>
                            <p className="text-xs text-muted-foreground">Resumen</p>
                            <p className="text-sm">{session.summary}</p>
                          </div>
                        )}
                        {session.freeNotes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Notas</p>
                            <p className="text-sm whitespace-pre-wrap">{session.freeNotes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : sessionInfoView === 'clinical' ? (
              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Síntomas / Patologías</p>
                    <p>{patient.symptomsPathologies || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Patologías Recurrentes</p>
                    <p>{patient.recurrentPathologies || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Intervenciones quirúrgicas</p>
                    <p>{patient.surgicalInterventions || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Medicamentos</p>
                    <p>{patient.medications || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={reservoirTypeFilter} onValueChange={setReservoirTypeFilter}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Tipo de patógeno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {uniqueReservoirTypes.map((type) => (
                        <SelectItem key={type} value={type!}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredReservoirPairs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay pares reservorio para este filtro.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredReservoirPairs.map((pair) => {
                      const imported = isReservoirPairImported(pair);
                      return (
                        <div
                          key={pair.id}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/10"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{pair.pairCode}</Badge>
                              {pair.type && <Badge variant="secondary">{pair.type}</Badge>}
                              {pair.pathogen && <span className="text-sm font-medium">{pair.pathogen}</span>}
                            </div>
                            <p className="text-sm mt-1">
                              {pair.point1} ↔ {pair.point2}
                            </p>
                            {pair.symptoms && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pair.symptoms}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary"
                                  onClick={() => handleShowInfo(
                                    {
                                      id: pair.id,
                                      pairCode: pair.pairCode,
                                      point1: pair.point1,
                                      point2: pair.point2,
                                      kind: 'pair',
                                    },
                                    'symptoms'
                                  )}
                                >
                                  <Stethoscope className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Sintomatología</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary"
                                  onClick={() => handleShowInfo(
                                    {
                                      id: pair.id,
                                      pairCode: pair.pairCode,
                                      point1: pair.point1,
                                      point2: pair.point2,
                                      kind: 'pair',
                                    },
                                    'recommendations'
                                  )}
                                >
                                  <Lightbulb className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Recomendaciones</TooltipContent>
                            </Tooltip>
                            {imported ? (
                              <span className="ml-2 text-sm font-medium text-muted-foreground">Importado</span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                onClick={() => importReservoirPair(pair)}
                              >
                                Importar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
