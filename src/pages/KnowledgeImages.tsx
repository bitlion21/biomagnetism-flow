import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Save } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MASTER_TEMPLATES = [
  'CU1.cuerpo.frontal',
  'CU2.cuerpo.posterior',
  'CU3.cuerpo.3.4.derecho',
  'CU4.cuerpo.3.4.izquierdo',
  'CA5.cabeza.frontal',
  'CA6.cabeza.posterior',
  'CA7.cabeza.lateral.izquierdo',
  'CA8.cabeza.lateral.derecho',
  'CA9.cabeza.frontal.superior',
];

type MarkerColor = 'black' | 'red';

export function KnowledgeImagesPage() {
  const { biomagneticPairs } = useData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTemplate1, setSelectedTemplate1] = useState('CU1.cuerpo.frontal');
  const [selectedTemplate2, setSelectedTemplate2] = useState('CU1.cuerpo.frontal');
  const [markerColor, setMarkerColor] = useState<MarkerColor>('black');
  const [multiMarkerMode, setMultiMarkerMode] = useState(false);
  const [point1Image, setPoint1Image] = useState<string | null>(null);
  const [point2Image, setPoint2Image] = useState<string | null>(null);
  const [markers1, setMarkers1] = useState<{ x: number; y: number; color: MarkerColor; template: string }[]>([]);
  const [markers2, setMarkers2] = useState<{ x: number; y: number; color: MarkerColor; template: string }[]>([]);
  const [isEditingPairNumber, setIsEditingPairNumber] = useState(false);
  const [pairNumberInput, setPairNumberInput] = useState('');

  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);
  const baseImage1Ref = useRef<HTMLImageElement | null>(null);
  const baseImage2Ref = useRef<HTMLImageElement | null>(null);

  const orderedPairs = useMemo(() => {
    const getNumber = (code: string) => {
      const match = code.match(/\d+/);
      return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
    };
    return [...biomagneticPairs].sort((a, b) => getNumber(a.pairCode) - getNumber(b.pairCode));
  }, [biomagneticPairs]);

  const currentPair = orderedPairs[currentIndex];

  const pairNumber = useMemo(() => {
    if (!currentPair) return '';
    const match = currentPair.pairCode.match(/\d+/);
    return match ? match[0] : currentPair.pairCode;
  }, [currentPair]);

  const handlePairJump = (value: string) => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return;
    const targetCode = normalized.startsWith('N.') ? normalized : normalized.replace(/^0+/, '');
    const targetIndex = orderedPairs.findIndex(pair => {
      const code = pair.pairCode.toUpperCase();
      if (targetCode.startsWith('N.')) {
        return code === targetCode;
      }
      const match = code.match(/\d+/);
      return match ? match[0].replace(/^0+/, '') === targetCode : false;
    });
    if (targetIndex === -1) {
      toast.error('Par no encontrado');
      return;
    }
    handleSelectPair(targetIndex);
  };

  const getMarkerSize = (template: string) =>
    template.startsWith('CA') ? 60 : 60;

  const getMarkerStyle = (color: MarkerColor) => {
    if (color === 'red') {
      return { fill: '#ef4444', text: '+' };
    }
    return { fill: '#0f172a', text: '−' };
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar imagen'));
      img.src = src;
    });

  const normalizeWhitespace = (value: string) =>
    value
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizePointName = (value: string) =>
    normalizeWhitespace(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

  const getPointImageCandidates = (pointName: string, suffix?: string) => {
    const cleaned = normalizeWhitespace(pointName);
    const variants = [
      pointName,
      cleaned,
      cleaned.replace(' (D)', '(D)').replace(' (I)', '(I)'),
      cleaned.replace('(D)', ' (D)').replace('(I)', ' (I)'),
      cleaned.replace('(D/I)', '(D_I)'),
      cleaned.replace(' (D/I)', ' (D_I)'),
    ];
    const withSuffix = (value: string) => (suffix ? `${value}${suffix}` : value);
    const encoded = variants.flatMap(value => [
      `/images/puntos/${encodeURIComponent(withSuffix(value))}.png`,
      `/images/puntos/${encodeURIComponent(withSuffix(value.normalize('NFC')))}.png`,
      `/images/puntos/${encodeURIComponent(withSuffix(value.normalize('NFD')))}.png`,
      `/images/puntos/${encodeURIComponent(withSuffix(normalizePointName(value)))}.png`,
    ]);
    const candidates = encoded;
    return Array.from(new Set(candidates));
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawBaseImage = async (template: string, canvas: HTMLCanvasElement | null, targetRef: React.MutableRefObject<HTMLImageElement | null>) => {
    if (!canvas) return;
    try {
      const img = await loadImage(`/templates/master/${template}.png`);
      targetRef.current = img;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch {
      toast.error('No se pudo cargar la plantilla');
    }
  };

  const drawMarkers = (
    canvas: HTMLCanvasElement | null,
    baseImage: HTMLImageElement | null,
    markers: { x: number; y: number; color: MarkerColor; template: string }[]
  ) => {
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    markers.forEach(({ x, y, color, template }) => {
      const size = getMarkerSize(template);
      const radius = size / 2;
      const marker = getMarkerStyle(color);

      ctx.beginPath();
      ctx.fillStyle = marker.fill;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${size * 0.85}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.text, x, y + 1);
    });
  };

  const getCanvasClickPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLCanvasElement>,
    template: string,
    baseImageRef: React.MutableRefObject<HTMLImageElement | null>,
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    setPointImage: React.Dispatch<React.SetStateAction<string | null>>,
    markers: { x: number; y: number; color: MarkerColor; template: string }[],
    setMarkers: React.Dispatch<React.SetStateAction<{ x: number; y: number; color: MarkerColor; template: string }[]>>
  ) => {
    if (!baseImageRef.current) return;
    const { x, y } = getCanvasClickPoint(event);
    const nextMarkers = multiMarkerMode
      ? [...markers, { x, y, color: markerColor, template }]
      : [{ x, y, color: markerColor, template }];
    setMarkers(nextMarkers);
    drawMarkers(canvasRef.current, baseImageRef.current, nextMarkers);
    if (canvasRef.current) {
      setPointImage(canvasRef.current.toDataURL('image/png'));
    }
  };

  const loadExistingPointImage = async (
    pointName: string,
    pairCode: string,
    defaultVariant: MarkerColor,
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    setPointImage: React.Dispatch<React.SetStateAction<string | null>>,
    baseImageRef: React.MutableRefObject<HTMLImageElement | null>,
    setMarkers: React.Dispatch<React.SetStateAction<{ x: number; y: number; color: MarkerColor; template: string }[]>>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mixedSuffix = `__mixto__${pairCode}`;
    const colorSuffix = `__${defaultVariant === 'black' ? 'negro' : 'rojo'}`;
    const candidates = [
      ...getPointImageCandidates(pointName, mixedSuffix),
      ...getPointImageCandidates(pointName, colorSuffix),
    ];
    for (const src of candidates) {
      try {
        const img = await loadImage(src);
        baseImageRef.current = img;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setMarkers([]);
        setPointImage(src);
        return;
      } catch {
        // try next candidate
      }
    }

    clearCanvas(canvasRef.current);
    setMarkers([]);
    setPointImage(null);
  };

  const handleSavePointImage = (
    pointName: string,
    pairCode: string,
    defaultVariant: MarkerColor,
    markers: { x: number; y: number; color: MarkerColor; template: string }[],
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    setPointImage: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const uniqueColors = Array.from(new Set(markers.map(marker => marker.color)));
    const isMixed = uniqueColors.length > 1;
    const variant = isMixed ? 'mixto' : (uniqueColors[0] ?? defaultVariant);
    const suffix = variant === 'mixto'
      ? `__mixto__${pairCode}`
      : `__${variant === 'black' ? 'negro' : 'rojo'}`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${pointName}${suffix}.png`;
    link.click();
    setPointImage(dataUrl);
    toast.success(`Imagen guardada para ${pointName}`);
  };

  useEffect(() => {
    if (!multiMarkerMode) {
      setMarkers1([]);
      setMarkers2([]);
      if (baseImage1Ref.current) {
        drawMarkers(canvas1Ref.current, baseImage1Ref.current, []);
      }
      if (baseImage2Ref.current) {
        drawMarkers(canvas2Ref.current, baseImage2Ref.current, []);
      }
    }
  }, [multiMarkerMode]);

  const handleGeneratePair = async () => {
    if (!currentPair || !point1Image || !point2Image) return;
    try {
      const [img1, img2] = await Promise.all([loadImage(point1Image), loadImage(point2Image)]);
      const canvas = document.createElement('canvas');
      canvas.width = 2058;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img1, 0, 0, 1024, 1024);
      ctx.drawImage(img2, 1034, 0, 1024, 1024);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${pairNumber}.png`;
      link.click();
      toast.success(`Imagen generada para par ${currentPair.pairCode}`);
    } catch {
      toast.error('No se pudo generar la imagen del par');
    }
  };

  const handleSelectPair = async (index: number) => {
    setCurrentIndex(index);
    if (!orderedPairs[index]) return;
    const pair = orderedPairs[index];
    baseImage1Ref.current = null;
    baseImage2Ref.current = null;
    await Promise.all([
      loadExistingPointImage(pair.point1, pair.pairCode, 'black', canvas1Ref, setPoint1Image, baseImage1Ref, setMarkers1),
      loadExistingPointImage(pair.point2, pair.pairCode, 'red', canvas2Ref, setPoint2Image, baseImage2Ref, setMarkers2),
    ]);
  };

  useEffect(() => {
    if (!currentPair) return;
    baseImage1Ref.current = null;
    baseImage2Ref.current = null;
    loadExistingPointImage(currentPair.point1, currentPair.pairCode, 'black', canvas1Ref, setPoint1Image, baseImage1Ref, setMarkers1);
    loadExistingPointImage(currentPair.point2, currentPair.pairCode, 'red', canvas2Ref, setPoint2Image, baseImage2Ref, setMarkers2);
  }, [currentPair?.point1, currentPair?.point2]);

  useEffect(() => {
    if (currentIndex >= orderedPairs.length) {
      setCurrentIndex(Math.max(0, orderedPairs.length - 1));
    }
  }, [currentIndex, orderedPairs.length]);

  const showTemplateInPanel1 = () => {
    drawBaseImage(selectedTemplate1, canvas1Ref.current, baseImage1Ref);
    setMarkers1([]);
    setPoint1Image(null);
  };

  const showTemplateInPanel2 = () => {
    drawBaseImage(selectedTemplate2, canvas2Ref.current, baseImage2Ref);
    setMarkers2([]);
    setPoint2Image(null);
  };

  const clearMarkers = (
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    baseImageRef: React.MutableRefObject<HTMLImageElement | null>,
    setMarkers: React.Dispatch<React.SetStateAction<{ x: number; y: number; color: MarkerColor; template: string }[]>>,
    setPointImage: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    setMarkers([]);
    if (baseImageRef.current) {
      drawMarkers(canvasRef.current, baseImageRef.current, []);
      if (canvasRef.current) {
        setPointImage(canvasRef.current.toDataURL('image/png'));
      }
    } else {
      clearCanvas(canvasRef.current);
      setPointImage(null);
    }
  };

  if (!currentPair) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay pares disponibles.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Panel B */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Opciones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={markerColor === 'black' ? 'default' : 'outline'}
                onClick={() => setMarkerColor('black')}
              >
                Negro
              </Button>
              <Button
                size="sm"
                variant={markerColor === 'red' ? 'default' : 'outline'}
                onClick={() => setMarkerColor('red')}
              >
                Rojo
              </Button>
              <Button
                size="sm"
                variant={multiMarkerMode ? 'default' : 'outline'}
                onClick={() => setMultiMarkerMode(prev => !prev)}
              >
                +
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Panel B1 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm">Imagen Punto 1</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearMarkers(canvas1Ref, baseImage1Ref, setMarkers1, setPoint1Image)}
                  >
                    Borrar 1
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleSavePointImage(
                        currentPair.point1,
                        currentPair.pairCode,
                        'black',
                        markers1,
                        canvas1Ref,
                        setPoint1Image
                      )
                    }
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar P1
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg bg-muted/10 p-2">
                  <canvas
                    ref={canvas1Ref}
                    width={1024}
                    height={1024}
                    className="w-full h-auto rounded-md cursor-crosshair"
                    onClick={(event) =>
                      handleCanvasClick(
                        event,
                        selectedTemplate1,
                        baseImage1Ref,
                        canvas1Ref,
                        setPoint1Image,
                        markers1,
                        setMarkers1
                      )
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label>Selector de imagen master base</Label>
                    <Select value={selectedTemplate1} onValueChange={setSelectedTemplate1}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {MASTER_TEMPLATES.map(template => (
                          <SelectItem key={template} value={template}>{template}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" onClick={showTemplateInPanel1}>
                    Ver 1
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Panel B2 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm">Imagen Punto 2</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => clearMarkers(canvas2Ref, baseImage2Ref, setMarkers2, setPoint2Image)}
                  >
                    Borrar 2
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleSavePointImage(
                        currentPair.point2,
                        currentPair.pairCode,
                        'red',
                        markers2,
                        canvas2Ref,
                        setPoint2Image
                      )
                    }
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar P2
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg bg-muted/10 p-2">
                  <canvas
                    ref={canvas2Ref}
                    width={1024}
                    height={1024}
                    className="w-full h-auto rounded-md cursor-crosshair"
                    onClick={(event) =>
                      handleCanvasClick(
                        event,
                        selectedTemplate2,
                        baseImage2Ref,
                        canvas2Ref,
                        setPoint2Image,
                        markers2,
                        setMarkers2
                      )
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label>Selector de imagen master base</Label>
                    <Select value={selectedTemplate2} onValueChange={setSelectedTemplate2}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {MASTER_TEMPLATES.map(template => (
                          <SelectItem key={template} value={template}>{template}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" variant="outline" onClick={showTemplateInPanel2}>
                    Ver 2
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Panel A */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Par actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSelectPair(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Par</p>
                  {isEditingPairNumber ? (
                    <Input
                      value={pairNumberInput}
                      onChange={(e) => setPairNumberInput(e.target.value)}
                      className="h-8 w-24 text-center text-sm"
                      placeholder="N.500 o 34"
                      autoFocus
                      onBlur={() => setIsEditingPairNumber(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePairJump(pairNumberInput);
                          setIsEditingPairNumber(false);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsEditingPairNumber(false);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-base font-semibold hover:text-primary transition-colors"
                      onClick={() => {
                        setPairNumberInput(currentPair.pairCode);
                        setIsEditingPairNumber(true);
                      }}
                    >
                      {currentPair.pairCode}
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">{currentIndex + 1} / {orderedPairs.length}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSelectPair(Math.min(orderedPairs.length - 1, currentIndex + 1))}
                  disabled={currentIndex === orderedPairs.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Punto 1</p>
                  <p className="font-medium">{currentPair.point1}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Punto 2</p>
                  <p className="font-medium">{currentPair.point2}</p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleGeneratePair}
                disabled={!point1Image || !point2Image}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Generar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Las imágenes se descargan en tu computadora. Luego súbelas manualmente a
        <span className="font-medium text-foreground"> /public/images/puntos </span>
        y
        <span className="font-medium text-foreground"> /public/images/pares </span>
        para que queden disponibles en la app.
      </p>
    </div>
  );
}
