import React, { useState, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Clock, User, MoreVertical, Play, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>();

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = getAppointmentsByDate(dateString);
  const canAddMore = canAddAppointmentOnDate(dateString);

  // Get all dates that have appointments for the calendar indicators
  const datesWithAppointments = useMemo(() => {
    const dates = new Set<string>();
    appointments.forEach(apt => {
      if (apt.status !== 'cancelled') {
        dates.add(apt.date);
      }
    });
    return dates;
  }, [appointments]);

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

      {/* Calendar with month navigation */}
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={es}
            className="w-full pointer-events-auto"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-2",
              cell: "flex-1 h-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                "h-10 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md inline-flex items-center justify-center"
              ),
              day_range_end: "day-range-end",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "day-outside text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              DayContent: ({ date }) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const hasAppointments = datesWithAppointments.has(dateStr);
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span>{date.getDate()}</span>
                    {hasAppointments && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-destructive rounded-full" />
                    )}
                  </div>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Selected date header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className={cn(
            "text-lg font-semibold capitalize",
            isToday(selectedDate) ? "text-primary" : "text-foreground"
          )}>
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </h2>
          {isToday(selectedDate) && (
            <Badge variant="secondary" className="text-xs w-fit mt-1">Hoy</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{dayAppointments.length} / 4</span>
          {!canAddMore && (
            <Badge variant="destructive" className="text-xs">Límite</Badge>
          )}
        </div>
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
