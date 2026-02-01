import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Upload, Download, AlertTriangle, Stethoscope, Lightbulb } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { BiomagneticPair } from '@/types';
import { toast } from 'sonner';

export function KnowledgePage() {
  const { biomagneticPairs, deleteBiomagneticPair, deleteAllBiomagneticPairs } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRelation, setFilterRelation] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<BiomagneticPair | undefined>();
  
  // Info dialog state
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogType, setInfoDialogType] = useState<'symptoms' | 'recommendations'>('symptoms');
  const [infoDialogPair, setInfoDialogPair] = useState<BiomagneticPair | null>(null);

  // Get unique relations and types for filters
  const uniqueRelations = [...new Set(biomagneticPairs.map(p => p.relation).filter(Boolean))];
  const uniqueTypes = [...new Set(biomagneticPairs.map(p => p.type).filter(Boolean))];

  // Filter pairs
  const filteredPairs = biomagneticPairs.filter(pair => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      pair.pairCode.toLowerCase().includes(query) ||
      pair.point1.toLowerCase().includes(query) ||
      pair.point2.toLowerCase().includes(query) ||
      (pair.name && pair.name.toLowerCase().includes(query)) ||
      (pair.pathogen && pair.pathogen.toLowerCase().includes(query)) ||
      (pair.symptoms && pair.symptoms.toLowerCase().includes(query));
    
    const matchesRelation = filterRelation === 'all' || pair.relation === filterRelation;
    const matchesType = filterType === 'all' || pair.type === filterType;

    return matchesSearch && matchesRelation && matchesType;
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

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Base de Conocimiento</h1>
            <p className="text-muted-foreground">{biomagneticPairs.length} pares biomagnéticos</p>
          </div>
          <div className="flex gap-2">
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, punto, nombre, patógeno, síntoma..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRelation} onValueChange={setFilterRelation}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Relación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las relaciones</SelectItem>
                  {uniqueRelations.map(relation => (
                    <SelectItem key={relation} value={relation!}>{relation}</SelectItem>
                  ))}
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
                {searchQuery || filterRelation !== 'all' || filterType !== 'all' 
                  ? 'Sin resultados' 
                  : 'Sin pares registrados'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterRelation !== 'all' || filterType !== 'all'
                  ? 'No se encontraron pares con esos filtros'
                  : 'Agrega tu primer par biomagnético'
                }
              </p>
              {!searchQuery && filterRelation === 'all' && filterType === 'all' && (
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
                                className="text-warning hover:text-warning"
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
      </div>
    </TooltipProvider>
  );
}
