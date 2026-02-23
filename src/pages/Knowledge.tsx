import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Upload, Download, AlertTriangle, Stethoscope, Lightbulb, Image as ImageIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PairDialog } from '@/components/knowledge/PairDialog';
import { PairInfoDialog } from '@/components/knowledge/PairInfoDialog';
import { ImportPairsDialog } from '@/components/knowledge/ImportPairsDialog';
import { BiomagneticPair, DiseaseCondition, ProtocolItem } from '@/types';
import { toast } from 'sonner';
import { getPairImageLabel } from '@/lib/pairImage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function KnowledgePage() {
  const {
    biomagneticPairs,
    deleteBiomagneticPair,
    deleteAllBiomagneticPairs,
    diseaseConditions,
    replaceDiseaseConditions,
    protocolItems,
  } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOnlyPoints, setSearchOnlyPoints] = useState(false);
  const [filterPathogen, setFilterPathogen] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [diseaseSearchQuery, setDiseaseSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [protocolSearchQuery, setProtocolSearchQuery] = useState('');
  const [protocolGroupFilter, setProtocolGroupFilter] = useState<string>('all');
  const [protocolCategoryFilter, setProtocolCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<BiomagneticPair | undefined>();
  const diseaseFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Info dialog state
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogType, setInfoDialogType] = useState<'symptoms' | 'recommendations'>('symptoms');
  const [infoDialogPair, setInfoDialogPair] = useState<BiomagneticPair | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogPair, setImageDialogPair] = useState<BiomagneticPair | null>(null);

  // Get unique pathogens and types for filters
  const uniquePathogens = [...new Set(biomagneticPairs.map(p => p.pathogen).filter(Boolean))];
  const uniqueTypes = [...new Set(biomagneticPairs.map(p => p.type).filter(Boolean))];

  const normalizeText = useCallback(
    (value?: string) =>
      (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim(),
    []
  );

  const alphabet = useMemo(() => {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    const nIndex = letters.indexOf('N');
    if (nIndex !== -1) {
      letters.splice(nIndex + 1, 0, 'Ñ');
    }
    return letters;
  }, []);

  const uniqueProtocolGroups = useMemo(
    () =>
      [...new Set(
        protocolItems
          .filter(item => normalizeText(item.protocolCategory) === normalizeText('Básico'))
          .map(item => item.group)
          .filter(Boolean)
      )]
        .map(value => value!.trim())
        .filter(value => Boolean(value) && normalizeText(value) !== 'grupo')
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
    [normalizeText, protocolItems]
  );

  // Filter pairs
  const filteredPairs = biomagneticPairs.filter(pair => {
    const query = normalizeText(searchQuery);
    const matchesSearch = !query || (
      searchOnlyPoints
        ? (
          normalizeText(pair.point1).includes(query) ||
          normalizeText(pair.point2).includes(query)
        )
        : (
          normalizeText(pair.pairCode).includes(query) ||
          normalizeText(pair.point1).includes(query) ||
          normalizeText(pair.point2).includes(query) ||
          normalizeText(pair.name).includes(query) ||
          normalizeText(pair.pathogen).includes(query) ||
          normalizeText(pair.symptoms).includes(query)
        )
    );
    
    const typeNormalized = normalizeText(pair.type);
    const pathogenNormalized = normalizeText(pair.pathogen);
    const isKnownType = ['virus', 'bacteria', 'hongo', 'parasito'].some(typeLabel =>
      typeNormalized.includes(typeLabel) || pathogenNormalized.includes(typeLabel)
    );

    let matchesPathogen = true;
    if (filterPathogen === 'unassigned') {
      matchesPathogen = !isKnownType;
    } else if (filterPathogen !== 'all') {
      matchesPathogen = pathogenNormalized === normalizeText(filterPathogen);
    }

    const matchesType = filterType === 'all' || pair.type === filterType;

    return matchesSearch && matchesPathogen && matchesType;
  });

  const handleOpenDialog = (pair?: BiomagneticPair) => {
    setEditingPair(pair);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPair(undefined);
  };

  const handleDelete = (pair: BiomagneticPair) => {
    if (confirm(`¿Eliminar el par ${pair.pairCode}?`)) {
      deleteBiomagneticPair(pair.id);
      toast.success('Par eliminado');
    }
  };

  const handleShowInfo = (pair: BiomagneticPair, type: 'symptoms' | 'recommendations') => {
    setInfoDialogPair(pair);
    setInfoDialogType(type);
    setInfoDialogOpen(true);
  };

  const getPairImagePath = (pair: BiomagneticPair) => {
    const match = pair.pairCode.match(/\d+/);
    const number = match ? match[0] : pair.pairCode;
    return `/images/pares/${number}.png`;
  };

  const handleExport = () => {
    if (biomagneticPairs.length === 0) {
      toast.error('No hay pares para exportar');
      return;
    }

    const exportData = biomagneticPairs.map(pair => ({
      CODIGO: pair.pairCode,
      'PUNTO 1': pair.point1,
      'PUNTO 2': pair.point2,
      NOMBRE: pair.name || '',
      RELACION: pair.relation || '',
      PATOGENO: pair.pathogen || '',
      TIPO: pair.type || '',
      SINTOMATOLOGIA: pair.symptoms || '',
      RECOMENDACIONES: pair.recommendations || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pares Biomagnéticos');
    
    XLSX.writeFile(workbook, 'pares_biomagneticos.xlsx');
    toast.success(`${biomagneticPairs.length} pares exportados`);
  };

  type SpreadsheetRow = Record<string, unknown>;

  const getFirstColumnValue = (row: SpreadsheetRow) => {
    const firstKey = Object.keys(row)[0];
    return firstKey ? row[firstKey] : undefined;
  };

  const buildDiseaseItems = (rows: SpreadsheetRow[]): DiseaseCondition[] => {
    return rows
      .map((row, index) => {
        const normalizedRow = Object.entries(row).reduce<SpreadsheetRow>((acc, [key, value]) => {
          acc[key.toLowerCase().trim()] = value;
          return acc;
        }, {});

        const name =
          normalizedRow['nombre'] ||
          normalizedRow['enfermedad'] ||
          normalizedRow['afeccion'] ||
          normalizedRow['nombre_enfermedad'] ||
          normalizedRow['name'] ||
          normalizedRow['disease'] ||
          getFirstColumnValue(row);
        const description =
          normalizedRow['texto'] ||
          normalizedRow['descripcion'] ||
          normalizedRow['descripción'] ||
          normalizedRow['notas'] ||
          normalizedRow['notes'] ||
          normalizedRow['description'];
        const letter = normalizedRow['letra'];
        const url =
          normalizedRow['url'] ||
          normalizedRow['enlace'];
        const cleanName = typeof name === 'string' ? name.trim() : '';
        if (!cleanName) return null;
        return {
          id: `${Date.now().toString(36)}-${index}`,
          name: cleanName,
          description: typeof description === 'string' ? description.trim() : undefined,
          letter: typeof letter === 'string' ? letter.trim().toUpperCase() : cleanName.charAt(0).toUpperCase(),
          url: typeof url === 'string' ? url.trim() : undefined,
        } as DiseaseCondition;
      })
      .filter(Boolean) as DiseaseCondition[];
  };

  const handleImportDiseases = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const items = buildDiseaseItems(jsonData as SpreadsheetRow[]);
      if (items.length === 0) {
        toast.error('No se encontraron filas válidas. Revisa los encabezados.');
        return;
      }
      replaceDiseaseConditions(items);
      toast.success(`${items.length} enfermedades/afecciones importadas`);
    } catch (error) {
      toast.error('Error al importar el archivo');
    }
  };

  const filteredDiseaseConditions = useMemo(() => {
    const query = normalizeText(diseaseSearchQuery);
    return diseaseConditions.filter(item => {
      const matchesSearch = !query || normalizeText(item.name).includes(query);
      const matchesLetter = selectedLetter === 'all' || (item.letter || '').toUpperCase() === selectedLetter;
      return matchesSearch && matchesLetter;
    });
  }, [diseaseConditions, diseaseSearchQuery, normalizeText, selectedLetter]);

  const filteredProtocols = useMemo(() => {
    const query = normalizeText(protocolSearchQuery);
    return protocolItems.filter(item => {
      const isHeaderRow =
        normalizeText(item.columns[0]) === 'numero' &&
        normalizeText(item.columns[1]) === 'par' &&
        normalizeText(item.columns[2]) === 'grupo' &&
        normalizeText(item.columns[3]) === 'protocolo';
      if (isHeaderRow) return false;

      const matchesSearch =
        !query ||
        item.columns.some(columnValue => normalizeText(columnValue).includes(query));

      const matchesGroup =
        protocolGroupFilter === 'all' ||
        normalizeText(item.group) === normalizeText(protocolGroupFilter);

      const categoryNormalized = normalizeText(item.protocolCategory);
      const matchesCategory =
        protocolCategoryFilter === 'all' ||
        (protocolCategoryFilter === 'basic' && categoryNormalized === normalizeText('Básico')) ||
        (protocolCategoryFilter === 'x-disease' && categoryNormalized === normalizeText('x Enfermedad'));

      return matchesSearch && matchesGroup && matchesCategory;
    });
  }, [
    normalizeText,
    protocolCategoryFilter,
    protocolGroupFilter,
    protocolItems,
    protocolSearchQuery,
  ]);

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Base de Conocimiento</h1>
            <p className="text-muted-foreground">{biomagneticPairs.length} pares biomagnéticos</p>
            <Button variant="link" className="px-0 h-auto mt-1" asChild>
              <Link to="/knowledge/help">
                Ayuda
              </Link>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/knowledge/images">
                <ImageIcon className="w-4 h-4 mr-2" />
                Imágenes
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive" disabled={biomagneticPairs.length === 0}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Borrar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    ¿Eliminar toda la base de datos?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará permanentemente los {biomagneticPairs.length} pares biomagnéticos. 
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteAllBiomagneticPairs();
                      toast.success('Base de datos eliminada');
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={handleExport} disabled={biomagneticPairs.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Par
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pairs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pairs">Lista de pares</TabsTrigger>
            <TabsTrigger value="protocols">Protocolos</TabsTrigger>
            <TabsTrigger value="diseases">Enfermedades y afecciones</TabsTrigger>
          </TabsList>

          <TabsContent value="pairs" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant={searchOnlyPoints ? 'default' : 'outline'}
                    onClick={() => setSearchOnlyPoints(prev => !prev)}
                    className="w-full sm:w-auto"
                    aria-pressed={searchOnlyPoints}
                  >
                    pares
                  </Button>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código, punto, nombre, patógeno, síntoma..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                        onClick={() => setSearchQuery('')}
                        aria-label="Limpiar búsqueda de pares"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={filterPathogen} onValueChange={setFilterPathogen}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Patógeno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los patógenos</SelectItem>
                      {uniquePathogens.map(pathogen => (
                        <SelectItem key={pathogen} value={pathogen!}>{pathogen}</SelectItem>
                      ))}
                      <SelectItem value="unassigned">Sin id</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type!}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pairs table */}
            {filteredPairs.length === 0 ? (
              <Card>
                <CardContent className="empty-state py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    {searchQuery || filterPathogen !== 'all' || filterType !== 'all' 
                      ? 'Sin resultados' 
                      : 'Sin pares registrados'
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterPathogen !== 'all' || filterType !== 'all'
                      ? 'No se encontraron pares con esos filtros'
                      : 'Agrega tu primer par biomagnético'
                    }
                  </p>
                  {!searchQuery && filterPathogen === 'all' && filterType === 'all' && !searchOnlyPoints && (
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar par
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Punto 1</TableHead>
                        <TableHead>Punto 2</TableHead>
                        <TableHead className="hidden md:table-cell">Nombre</TableHead>
                        <TableHead className="hidden lg:table-cell">Relación</TableHead>
                        <TableHead>Patógeno</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPairs.map((pair) => (
                        <TableRow key={pair.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {pair.pairCode}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{pair.point1}</TableCell>
                          <TableCell>{pair.point2}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {pair.name || '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {pair.relation || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{pair.pathogen || '-'}</TableCell>
                          <TableCell>
                            {pair.type && (
                              <Badge variant="secondary">{pair.type}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setImageDialogPair(pair);
                                  setImageDialogOpen(true);
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver imagen</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleShowInfo(pair, 'symptoms')}
                                className="text-primary hover:text-primary"
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
                                onClick={() => handleShowInfo(pair, 'recommendations')}
                                className="text-primary hover:text-primary"
                              >
                                <Lightbulb className="w-4 h-4" />
                              </Button>
                                </TooltipTrigger>
                                <TooltipContent>Recomendaciones</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenDialog(pair)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(pair)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="protocols" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar en protocolos..."
                      value={protocolSearchQuery}
                      onChange={(e) => setProtocolSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {protocolSearchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                        onClick={() => setProtocolSearchQuery('')}
                        aria-label="Limpiar búsqueda de protocolos"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={protocolCategoryFilter} onValueChange={setProtocolCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="basic">Básicos</SelectItem>
                      <SelectItem value="x-disease">x enfermedad</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={protocolGroupFilter} onValueChange={setProtocolGroupFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueProtocolGroups.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {filteredProtocols.length === 0 ? (
              <Card>
                <CardContent className="empty-state py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">Sin protocolos</h3>
                  <p className="text-muted-foreground">
                    Importa un XLSX desde "Lista de pares" con la pestaña <code>02.Protocolos</code> o revisa los filtros.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Par/Enfermedad</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Protocolo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProtocols.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.columns[0] || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{item.columns[1] || '-'}</TableCell>
                          <TableCell>{item.group || '-'}</TableCell>
                          <TableCell>
                            {item.protocolCategory ? (
                              <Badge variant="secondary">{item.protocolCategory}</Badge>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="diseases" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar enfermedad o afección..."
                      value={diseaseSearchQuery}
                      onChange={(e) => setDiseaseSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {diseaseSearchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                        onClick={() => setDiseaseSearchQuery('')}
                        aria-label="Limpiar búsqueda de enfermedades"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    ref={diseaseFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportDiseases(file);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => diseaseFileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedLetter === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedLetter('all')}
                  >
                    Todas
                  </Button>
                  {alphabet.map(letter => (
                    <Button
                      key={letter}
                      size="sm"
                      variant={selectedLetter === letter ? 'default' : 'outline'}
                      onClick={() => setSelectedLetter(letter)}
                    >
                      {letter}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {filteredDiseaseConditions.length === 0 ? (
              <Card>
                <CardContent className="empty-state py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    {diseaseSearchQuery || selectedLetter !== 'all' 
                      ? 'Sin resultados' 
                      : 'Sin enfermedades registradas'
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {diseaseSearchQuery || selectedLetter !== 'all'
                      ? 'No se encontraron enfermedades con esos filtros'
                      : 'Importa tu primera tabla de enfermedades'
                    }
                  </p>
                  {!diseaseSearchQuery && selectedLetter === 'all' && (
                    <Button variant="outline" onClick={() => diseaseFileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Importar tabla
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredDiseaseConditions.map((item) => (
                  <Link
                    key={item.id}
                    className="text-left border rounded-lg p-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    to={`/knowledge/diseases/${item.id}`}
                  >
                    <p className="font-semibold text-sm text-foreground">{item.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Pair Dialog */}
        <PairDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          pair={editingPair}
        />

        {/* Import Dialog */}
        <ImportPairsDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
        />

        {/* Info Dialog */}
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
                  src={getPairImagePath(imageDialogPair)}
                  alt={getPairImageLabel(imageDialogPair.pairCode, imageDialogPair.point1, imageDialogPair.point2)}
                  title={getPairImageLabel(imageDialogPair.pairCode, imageDialogPair.point1, imageDialogPair.point2)}
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
