import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, User, MoreVertical, FileText, X } from 'lucide-react';
import { FIXED_PATIENT_ID, useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PatientDialog } from '@/components/patients/PatientDialog';
import { Patient } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PatientsPage() {
  const navigate = useNavigate();
  const { patients, deletePatient, getSessionsByPatient } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>();

  const filteredPatients = patients.filter(patient => {
    const query = searchQuery.toLowerCase();
    const fullName = `${patient.name || ''} ${patient.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(query) ||
      patient.phone.includes(query) ||
      (patient.email && patient.email.toLowerCase().includes(query))
    );
  });

  const handleOpenDialog = (patient?: Patient) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPatient(undefined);
  };

  const getInitials = (patient: Patient) => {
    if (patient.name) {
      return `${patient.name.charAt(0)}${patient.lastName?.charAt(0) || ''}`.toUpperCase();
    }
    return patient.phone.slice(-2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">{patients.length} pacientes registrados</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
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
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Patients list */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="empty-state py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {searchQuery ? 'Sin resultados' : 'Sin pacientes'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'No se encontraron pacientes con esa búsqueda'
                : 'Agrega tu primer paciente para comenzar'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar paciente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPatients.map((patient) => {
            const sessions = getSessionsByPatient(patient.id);
            const isProtectedPatient = patient.id === FIXED_PATIENT_ID;
            return (
              <Card 
                key={patient.id} 
                className="card-interactive cursor-pointer"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={patient.photo} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(patient)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {patient.name 
                          ? `${patient.name} ${patient.lastName || ''}`.trim()
                          : 'Sin nombre'
                        }
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {patient.phone}
                        </span>
                        <span>{sessions.length} sesiones</span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/patients/${patient.id}`);
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          Ver ficha completa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(patient);
                        }}>
                          Editar datos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/session/${patient.id}`);
                        }}>
                          Iniciar sesión
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled={isProtectedPatient}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isProtectedPatient) {
                              return;
                            }
                            if (confirm('¿Estás seguro de eliminar este paciente?')) {
                              deletePatient(patient.id);
                            }
                          }}
                          className={isProtectedPatient ? "text-muted-foreground" : "text-destructive"}
                        >
                          {isProtectedPatient ? 'Paciente protegido (no se puede borrar)' : 'Eliminar paciente'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Patient Dialog */}
      <PatientDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        patient={editingPatient}
      />
    </div>
  );
}
