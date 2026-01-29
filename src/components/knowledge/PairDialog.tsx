import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { BiomagneticPair } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PairDialogProps {
  open: boolean;
  onClose: () => void;
  pair?: BiomagneticPair;
}

export function PairDialog({ open, onClose, pair }: PairDialogProps) {
  const { biomagneticPairs, addBiomagneticPair, updateBiomagneticPair } = useData();
  const isEditing = !!pair;

  const [formData, setFormData] = useState({
    pairCode: '',
    point1: '',
    point2: '',
    pathogen: '',
    type: '',
    symptoms: '',
    group: '',
    notes: '',
  });

  useEffect(() => {
    if (pair) {
      setFormData({
        pairCode: pair.pairCode,
        point1: pair.point1,
        point2: pair.point2,
        pathogen: pair.pathogen || '',
        type: pair.type || '',
        symptoms: pair.symptoms || '',
        group: pair.group || '',
        notes: pair.notes || '',
      });
    } else {
      setFormData({
        pairCode: '',
        point1: '',
        point2: '',
        pathogen: '',
        type: '',
        symptoms: '',
        group: '',
        notes: '',
      });
    }
  }, [pair, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pairCode.trim() || !formData.point1.trim() || !formData.point2.trim()) {
      toast.error('Código, Punto 1 y Punto 2 son obligatorios');
      return;
    }

    // Check for unique pair code
    const existingPair = biomagneticPairs.find(
      p => p.pairCode.toLowerCase() === formData.pairCode.trim().toLowerCase()
    );
    if (existingPair && existingPair.id !== pair?.id) {
      toast.error('Ya existe un par con este código');
      return;
    }

    const pairData = {
      pairCode: formData.pairCode.trim(),
      point1: formData.point1.trim(),
      point2: formData.point2.trim(),
      pathogen: formData.pathogen.trim() || undefined,
      type: formData.type.trim() || undefined,
      symptoms: formData.symptoms.trim() || undefined,
      group: formData.group.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (isEditing) {
      updateBiomagneticPair(pair.id, pairData);
      toast.success('Par actualizado');
    } else {
      addBiomagneticPair(pairData);
      toast.success('Par creado');
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Par' : 'Nuevo Par Biomagnético'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica los datos del par biomagnético'
              : 'Agrega un nuevo par a la base de conocimiento'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <Label htmlFor="pairCode">Código *</Label>
              <Input
                id="pairCode"
                placeholder="PAR-001"
                value={formData.pairCode}
                onChange={(e) => setFormData(prev => ({ ...prev, pairCode: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <Label htmlFor="group">Grupo</Label>
              <Input
                id="group"
                placeholder="Cabeza, Tronco, etc."
                value={formData.group}
                onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <Label htmlFor="point1">Punto 1 *</Label>
              <Input
                id="point1"
                placeholder="Nombre del primer punto"
                value={formData.point1}
                onChange={(e) => setFormData(prev => ({ ...prev, point1: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <Label htmlFor="point2">Punto 2 *</Label>
              <Input
                id="point2"
                placeholder="Nombre del segundo punto"
                value={formData.point2}
                onChange={(e) => setFormData(prev => ({ ...prev, point2: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-field">
              <Label htmlFor="pathogen">Patógeno</Label>
              <Input
                id="pathogen"
                placeholder="Bacteria, virus, etc."
                value={formData.pathogen}
                onChange={(e) => setFormData(prev => ({ ...prev, pathogen: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="type">Tipo</Label>
              <Input
                id="type"
                placeholder="Bacteria, Virus, Hongo, Parásito"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-field">
            <Label htmlFor="symptoms">Síntomas</Label>
            <Textarea
              id="symptoms"
              placeholder="Síntomas asociados a este par..."
              value={formData.symptoms}
              onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales sobre el par..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Guardar cambios' : 'Crear par'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
