import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { BiomagneticPair } from '@/types';
import { toast } from 'sonner';

interface ImportPairsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedPair {
  pairCode?: string;
  point1: string;
  point2: string;
  name?: string;
  relation?: string;
  pathogen?: string;
  type?: string;
  symptoms?: string;
  recommendations?: string;
}

interface ImportResult {
  success: number;
  duplicates: number;
  errors: number;
}

// Column name mappings (Spanish to English)
const COLUMN_MAPPINGS: Record<string, keyof ParsedPair> = {
  // CODIGO
  'codigo': 'pairCode',
  'código': 'pairCode',
  'code': 'pairCode',
  'paircode': 'pairCode',
  // PUNTO 1
  'punto 1': 'point1',
  'punto1': 'point1',
  'punto_1': 'point1',
  'point1': 'point1',
  'point 1': 'point1',
  // PUNTO 2
  'punto 2': 'point2',
  'punto2': 'point2',
  'punto_2': 'point2',
  'point2': 'point2',
  'point 2': 'point2',
  // NOMBRE
  'nombre': 'name',
  'name': 'name',
  // RELACION
  'relacion': 'relation',
  'relación': 'relation',
  'relation': 'relation',
  // PATOGENO
  'patogeno': 'pathogen',
  'patógeno': 'pathogen',
  'pathogen': 'pathogen',
  // TIPO
  'tipo': 'type',
  'type': 'type',
  // SINTOMATOLOGIA
  'sintomatologia': 'symptoms',
  'sintomatología': 'symptoms',
  'symptoms': 'symptoms',
  'sintomas': 'symptoms',
  'síntomas': 'symptoms',
  // RECOMENDACIONES
  'recomendaciones': 'recommendations',
  'recommendations': 'recommendations',
  'recomendacion': 'recommendations',
  'recomendación': 'recommendations',
};

const isParsedPairKey = (value: string): value is keyof ParsedPair =>
  value === 'pairCode' ||
  value === 'point1' ||
  value === 'point2' ||
  value === 'name' ||
  value === 'relation' ||
  value === 'pathogen' ||
  value === 'type' ||
  value === 'symptoms' ||
  value === 'recommendations';

export function ImportPairsDialog({ open, onClose }: ImportPairsDialogProps) {
  const { biomagneticPairs, addBiomagneticPair } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [parsedPairs, setParsedPairs] = useState<ParsedPair[]>([]);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setImportResult(null);
    setParsedPairs([]);

    try {
      const pairs = await parseFile(selectedFile);
      setParsedPairs(pairs);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Error al leer el archivo');
    }
  };

  const parseFile = async (file: File): Promise<ParsedPair[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      return parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return parseExcel(file);
    } else {
      throw new Error('Formato no soportado. Use archivos CSV o Excel (.xlsx, .xls)');
    }
  };

  const parseCSV = (file: File): Promise<ParsedPair[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('El archivo debe contener al menos una fila de encabezados y una de datos');
          }

          const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
	          const mappedHeaders = headers.map(h => COLUMN_MAPPINGS[h] || h);

          const pairs: ParsedPair[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/[,;]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
            const pair: Partial<ParsedPair> = {};
            
	            mappedHeaders.forEach((header, index) => {
	              if (isParsedPairKey(header) && values[index]) {
	                pair[header] = values[index];
	              }
	            });

            if (pair.point1 && pair.point2) {
              pairs.push({
                pairCode: pair.pairCode,
                point1: pair.point1,
                point2: pair.point2,
                name: pair.name,
                relation: pair.relation,
                pathogen: pair.pathogen,
                type: pair.type,
                symptoms: pair.symptoms,
                recommendations: pair.recommendations,
              });
            }
          }

          if (pairs.length === 0) {
            throw new Error('No se encontraron pares válidos. Asegúrese de que el archivo tenga columnas "punto1" y "punto2"');
          }

          resolve(pairs);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  };

  const parseExcel = (file: File): Promise<ParsedPair[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
          
          if (jsonData.length === 0) {
            throw new Error('El archivo está vacío o no tiene datos válidos');
          }

          const pairs: ParsedPair[] = [];
          
          jsonData.forEach((row, index) => {
            const pair: Partial<ParsedPair> = {};
            
            Object.entries(row).forEach(([key, value]) => {
              const normalizedKey = key.toLowerCase().trim();
              const mappedKey = COLUMN_MAPPINGS[normalizedKey];
              
	              if (mappedKey && value) {
	                pair[mappedKey] = String(value).trim();
	              }
	            });

            if (pair.point1 && pair.point2) {
              pairs.push({
                pairCode: pair.pairCode,
                point1: pair.point1,
                point2: pair.point2,
                name: pair.name,
                relation: pair.relation,
                pathogen: pair.pathogen,
                type: pair.type,
                symptoms: pair.symptoms,
                recommendations: pair.recommendations,
              });
            }
          });

          if (pairs.length === 0) {
            throw new Error('No se encontraron pares válidos. Asegúrese de que el archivo tenga columnas "punto1" y "punto2"');
          }

          resolve(pairs);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (parsedPairs.length === 0) return;

    setImporting(true);
    const existingCodes = new Set(biomagneticPairs.map(p => p.pairCode.toLowerCase()));
    let nextCustomNumber = (() => {
      const customNumbers = biomagneticPairs
        .map(p => p.pairCode)
        .filter(code => /^N\.\d+$/.test(code))
        .map(code => parseInt(code.replace('N.', ''), 10));
      const maxCode = customNumbers.length > 0 ? Math.max(...customNumbers) : 499;
      return Math.max(500, maxCode + 1);
    })();
    
    let success = 0;
    let duplicates = 0;
    let errors = 0;

    for (const pair of parsedPairs) {
      try {
        let pairCode = pair.pairCode?.trim();
        if (!pairCode) {
          pairCode = `N.${nextCustomNumber}`;
          nextCustomNumber += 1;
        }
        if (existingCodes.has(pairCode.toLowerCase())) {
          duplicates++;
          continue;
        }
        
        addBiomagneticPair({ ...pair, pairCode });
        existingCodes.add(pairCode.toLowerCase());
        success++;
      } catch {
        errors++;
      }
    }

    setImportResult({ success, duplicates, errors });
    setImporting(false);

    if (success > 0) {
      toast.success(`${success} pares importados correctamente`);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedPairs([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Pares Biomagnéticos</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV o Excel con los pares a importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload area */}
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Haz clic para seleccionar archivo</p>
                <p className="text-xs text-muted-foreground mt-1">CSV, XLSX o XLS</p>
              </>
            )}
          </div>

          {/* Column info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Columnas requeridas</AlertTitle>
            <AlertDescription className="text-xs">
              <strong>punto1, punto2</strong> (obligatorias)<br />
              codigo, patogeno, tipo, sintomas, grupo, notas (opcionales)
            </AlertDescription>
          </Alert>

          {/* Parse error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Parse success */}
          {parsedPairs.length > 0 && !importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle>Archivo leído correctamente</AlertTitle>
              <AlertDescription>
                Se encontraron <strong>{parsedPairs.length}</strong> pares para importar.
              </AlertDescription>
            </Alert>
          )}

          {/* Import progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={50} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">Importando...</p>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle>Importación completada</AlertTitle>
              <AlertDescription>
                <ul className="text-xs mt-1">
                  <li>✓ {importResult.success} pares importados</li>
                  {importResult.duplicates > 0 && (
                    <li>⚠ {importResult.duplicates} duplicados omitidos</li>
                  )}
                  {importResult.errors > 0 && (
                    <li>✗ {importResult.errors} errores</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button 
              onClick={handleImport} 
              disabled={parsedPairs.length === 0 || importing}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar {parsedPairs.length > 0 && `(${parsedPairs.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
