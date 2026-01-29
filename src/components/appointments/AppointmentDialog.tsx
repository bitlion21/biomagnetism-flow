import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Appointment } from '@/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment;
  defaultDate?: string;
}

export function AppointmentDialog({ open, onClose, appointment, defaultDate }: AppointmentDialogProps) {
  const { patients, addAppointment, updateAppointment, canAddAppointmentOnDate } = useData();
  const isEditing = !!appointment;

  const [formData, setFormData] = useState({
    patientId: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '60',
    notes: '',
  });

  useEffect(() => {
    if (appointment) {
      setFormData({
        patientId: appointment.patientId,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration.toString(),
        notes: appointment.notes || '',
      });
    } else {
      setFormData(prev => ({
        ...prev,
        patientId: '',
        date: defaultDate || new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: '60',
        notes: '',
      }));
    }
  }, [appointment, defaultDate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId) {
      toast.error('Selecciona un paciente');
      return;
    }

    // Check if can add appointment on this date (only for new appointments or date changed)
    if (!isEditing || appointment.date !== formData.date) {
      if (!canAddAppointmentOnDate(formData.date)) {
        toast.error('Límite de 4 citas alcanzado para este día');
        return;
      }
    }

    const appointmentData = {
      patientId: formData.patientId,
      date: formData.date,
      time: formData.time,
      duration: parseInt(formData.duration),
      notes: formData.notes.trim() || undefined,
      status: 'scheduled' as const,
    };

    if (isEditing) {
      updateAppointment(appointment.id, appointmentData);
      toast.success('Cita actualizada');
    } else {
      const result = addAppointment(appointmentData);
      if (result) {
        toast.success('Cita creada');
      } else {
        toast.error('No se pudo crear la cita');
        return;
      }
    }

    onClose();
  };

  const getPatientLabel = (patient: { id: string; name?: string; lastName?: string; phone: string }) => {
    if (patient.name) {
      return `${patient.name} ${patient.lastName || ''} - ${patient.phone}`.trim();
    }
    return patient.phone;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica los datos de la cita'
              : 'Programa una nueva cita para un paciente'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="patient">Paciente *</Label>
            <Select
              value={formData.patientId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 ? (
                  <SelectItem value="" disabled>No hay pacientes registrados</SelectItem>
                ) : (
                  patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {getPatientLabel(patient)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="form-field">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <Label htmlFor="duration">Duración</Label>
            <Select
              value={formData.duration}
              onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1 hora 30 min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="form-field">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre la cita..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Guardar cambios' : 'Crear cita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
