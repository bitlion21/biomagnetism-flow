import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ArrowLeft, Phone, Mail, Calendar, Edit, Play, 
  Heart, AlertTriangle, Pill, Clock, User
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientDialog } from '@/components/patients/PatientDialog';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatientById, getSessionsByPatient } = useData();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const patient = getPatientById(id || '');
  const sessions = getSessionsByPatient(id || '');

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Paciente no encontrado</h2>
        <p className="text-muted-foreground mb-4">El paciente que buscas no existe</p>
        <Button onClick={() => navigate('/patients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a pacientes
        </Button>
      </div>
    );
  }

  const getInitials = () => {
    if (patient.name) {
      return `${patient.name.charAt(0)}${patient.lastName?.charAt(0) || ''}`.toUpperCase();
    }
    return patient.phone.slice(-2);
  };

  const InfoItem = ({ label, value, icon: Icon }: { label: string; value?: string | number | boolean; icon?: any }) => {
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue = value;
    if (typeof value === 'boolean') {
      displayValue = value ? 'Sí' : 'No';
    }
    
    return (
      <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground">{displayValue}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a pacientes
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={patient.photo} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {patient.name 
                  ? `${patient.name} ${patient.lastName || ''}`.trim()
                  : 'Sin nombre'
                }
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {patient.phone}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {patient.email}
                  </span>
                )}
                {patient.age && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {patient.age} años
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" onClick={() => navigate(`/session/${patient.id}`)}>
                  <Play className="w-4 h-4 mr-1" />
                  Iniciar Sesión
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Información Clínica</TabsTrigger>
          <TabsTrigger value="history">Historial ({sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          {/* Clinical info */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Datos Personales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InfoItem label="Sexo" value={patient.sex === 'male' ? 'Masculino' : patient.sex === 'female' ? 'Femenino' : patient.sex === 'other' ? 'Otro' : undefined} />
                <InfoItem label="Primera cita" value={patient.firstAppointmentDate ? format(new Date(patient.firstAppointmentDate), "d 'de' MMMM, yyyy", { locale: es }) : undefined} />
                <InfoItem label="Síntomas / Patologías" value={patient.symptomsPathologies} />
                <InfoItem label="Intervenciones quirúrgicas" value={patient.surgicalInterventions} />
              </CardContent>
            </Card>

            {/* Medical conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Condiciones Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {patient.hasPacemaker && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Marcapasos
                    </Badge>
                  )}
                  {patient.isPregnant && (
                    <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning border-warning/30">
                      Embarazo
                    </Badge>
                  )}
                  {patient.hasDiabetes && (
                    <Badge variant="secondary">Diabetes</Badge>
                  )}
                  {patient.bloodPressure && patient.bloodPressure !== 'normal' && (
                    <Badge variant="secondary">
                      Tensión {patient.bloodPressure === 'high' ? 'Alta' : 'Baja'}
                    </Badge>
                  )}
                  {patient.underMedicalTreatment && (
                    <Badge variant="secondary">En tratamiento médico</Badge>
                  )}
                  {patient.chemotherapyOrRadiation && (
                    <Badge variant="destructive">Quimio/Radioterapia</Badge>
                  )}
                </div>
                
                <InfoItem label="Última quimio/radioterapia" value={patient.lastChemoRadiationDate ? format(new Date(patient.lastChemoRadiationDate), "d 'de' MMMM, yyyy", { locale: es }) : undefined} />
                <InfoItem label="Medicamentos" value={patient.medications} icon={Pill} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="empty-state py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Sin historial</h3>
                <p className="text-muted-foreground mb-4">
                  Este paciente aún no tiene sesiones registradas
                </p>
                <Button onClick={() => navigate(`/session/${patient.id}`)}>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar primera sesión
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id} className="card-interactive">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/5 rounded-lg">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(session.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.selectedPairs.length} pares aplicados
                          </p>
                          {session.summary && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {session.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/session/${patient.id}?sessionId=${session.id}`)}>
                        Ver detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <PatientDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        patient={patient}
      />
    </div>
  );
}
