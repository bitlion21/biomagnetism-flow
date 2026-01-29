import React, { useState } from 'react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, User, MoreVertical, Play, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppointmentDialog } from '@/components/appointments/AppointmentDialog';
import { Appointment } from '@/types';
import { cn } from '@/lib/utils';

export function AgendaPage() {
  const navigate = useNavigate();
  const { appointments, patients, getAppointmentsByDate, canAddAppointmentOnDate, updateAppointment, deleteAppointment } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>();

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = getAppointmentsByDate(dateString);
  const canAddMore = canAddAppointmentOnDate(dateString);

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const handleOpenDialog = (appointment?: Appointment) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAppointment(undefined);
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Paciente desconocido';
    return patient.name ? `${patient.name} ${patient.lastName || ''}`.trim() : patient.phone;
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-info/10 text-info border-info/30">Programada</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Cancelada</Badge>;
    }
  };

  const sortedAppointments = [...dayAppointments].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">Gestiona tus citas del día</p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={!canAddMore}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      {/* Date navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={goToToday}
                className={cn(
                  "text-lg font-semibold capitalize transition-colors",
                  isToday(selectedDate) ? "text-primary" : "text-foreground hover:text-primary"
                )}
              >
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
              </button>
              {isToday(selectedDate) && (
                <Badge variant="secondary" className="text-xs">Hoy</Badge>
              )}
            </div>
            
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appointments limit indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>{dayAppointments.length} / 4 citas programadas</span>
        {!canAddMore && (
          <Badge variant="destructive" className="text-xs">Límite alcanzado</Badge>
        )}
      </div>

      {/* Appointments list */}
      {sortedAppointments.length === 0 ? (
        <Card>
          <CardContent className="empty-state py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Sin citas programadas</h3>
            <p className="text-muted-foreground mb-4">No hay citas para este día</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar primera cita
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((appointment) => (
            <Card key={appointment.id} className="card-interactive">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Time */}
                    <div className="flex flex-col items-center px-3 py-2 bg-primary/5 rounded-lg min-w-[70px]">
                      <span className="text-lg font-bold text-primary">{appointment.time}</span>
                      <span className="text-xs text-muted-foreground">{appointment.duration} min</span>
                    </div>
                    
                    {/* Patient info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span 
                          className="font-medium text-foreground hover:text-primary cursor-pointer"
                          onClick={() => navigate(`/patients/${appointment.patientId}`)}
                        >
                          {getPatientName(appointment.patientId)}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {appointment.notes}
                        </p>
                      )}
                      <div className="pt-1">
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {appointment.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/session/${appointment.patientId}?appointmentId=${appointment.id}`)}
                        className="hidden sm:flex"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar Sesión
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/patients/${appointment.patientId}`)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Ver ficha paciente
                        </DropdownMenuItem>
                        {appointment.status === 'scheduled' && (
                          <DropdownMenuItem 
                            onClick={() => navigate(`/session/${appointment.patientId}?appointmentId=${appointment.id}`)}
                            className="sm:hidden"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Iniciar sesión
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleOpenDialog(appointment)}>
                          Editar cita
                        </DropdownMenuItem>
                        {appointment.status === 'scheduled' && (
                          <DropdownMenuItem 
                            onClick={() => updateAppointment(appointment.id, { status: 'completed' })}
                          >
                            Marcar completada
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => updateAppointment(appointment.id, { status: 'cancelled' })}
                          className="text-destructive"
                        >
                          Cancelar cita
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        appointment={editingAppointment}
        defaultDate={dateString}
      />
    </div>
  );
}
