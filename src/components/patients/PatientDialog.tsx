import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatientDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient;
}

export function PatientDialog({ open, onClose, patient }: PatientDialogProps) {
  const { addPatient, updatePatient, getPatientByPhone } = useData();
  const isEditing = !!patient;
  type SexValue = NonNullable<Patient['sex']>;
  type BloodPressureValue = NonNullable<Patient['bloodPressure']>;

  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    lastName: '',
    email: '',
    birthDate: '',
    sex: '' as 'male' | 'female' | 'other' | '',
    symptomsPathologies: '',
    surgicalInterventions: '',
    hasPacemaker: false,
    isPregnant: false,
    hasDiabetes: false,
    bloodPressure: '' as 'high' | 'low' | 'normal' | '',
    underMedicalTreatment: false,
    chemotherapyOrRadiation: false,
    lastChemoRadiationDate: '',
    medications: '',
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        phone: patient.phone || '',
        name: patient.name || '',
        lastName: patient.lastName || '',
        email: patient.email || '',
        birthDate: patient.birthDate || '',
        sex: patient.sex || '',
        symptomsPathologies: patient.symptomsPathologies || '',
        surgicalInterventions: patient.surgicalInterventions || '',
        hasPacemaker: patient.hasPacemaker || false,
        isPregnant: patient.isPregnant || false,
        hasDiabetes: patient.hasDiabetes || false,
        bloodPressure: patient.bloodPressure || '',
        underMedicalTreatment: patient.underMedicalTreatment || false,
        chemotherapyOrRadiation: patient.chemotherapyOrRadiation || false,
        lastChemoRadiationDate: patient.lastChemoRadiationDate || '',
        medications: patient.medications || '',
      });
    } else {
      // Reset form
      setFormData({
        phone: '',
        name: '',
        lastName: '',
        email: '',
        birthDate: '',
        sex: '',
        symptomsPathologies: '',
        surgicalInterventions: '',
        hasPacemaker: false,
        isPregnant: false,
        hasDiabetes: false,
        bloodPressure: '',
        underMedicalTreatment: false,
        chemotherapyOrRadiation: false,
        lastChemoRadiationDate: '',
        medications: '',
      });
    }
  }, [patient, open]);

  const getAgeFromBirthDate = (birthDate?: string) => {
    if (!birthDate) return undefined;
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime())) return undefined;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const hasHadBirthdayThisYear =
      now.getMonth() > date.getMonth() ||
      (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
    if (!hasHadBirthdayThisYear) age -= 1;
    return age >= 0 ? age : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone
    if (!formData.phone.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }

    // Check if phone is unique (only for new patients or if phone changed)
    const existingPatient = getPatientByPhone(formData.phone.trim());
    if (existingPatient && existingPatient.id !== patient?.id) {
      toast.error('Ya existe un paciente con este teléfono');
      return;
    }

    const patientData = {
      phone: formData.phone.trim(),
      name: formData.name.trim() || undefined,
      lastName: formData.lastName.trim() || undefined,
      email: formData.email.trim() || undefined,
      birthDate: formData.birthDate || undefined,
      age: getAgeFromBirthDate(formData.birthDate),
      sex: formData.sex || undefined,
      symptomsPathologies: formData.symptomsPathologies.trim() || undefined,
      surgicalInterventions: formData.surgicalInterventions.trim() || undefined,
      hasPacemaker: formData.hasPacemaker,
      isPregnant: formData.isPregnant,
      hasDiabetes: formData.hasDiabetes,
      bloodPressure: formData.bloodPressure || undefined,
      underMedicalTreatment: formData.underMedicalTreatment,
      chemotherapyOrRadiation: formData.chemotherapyOrRadiation,
      lastChemoRadiationDate: formData.lastChemoRadiationDate || undefined,
      medications: formData.medications.trim() || undefined,
    };

    if (isEditing) {
      updatePatient(patient.id, patientData);
      toast.success('Paciente actualizado');
    } else {
      addPatient({
        ...patientData,
        firstAppointmentDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Paciente creado');
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Actualiza los datos del paciente'
              : 'El teléfono es obligatorio, el resto de campos son opcionales'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-foreground">Datos de contacto</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-field">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="paciente@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Personal info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-foreground">Datos personales</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-field">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Nombre"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="lastName">Apellidos</Label>
                  <Input
                    id="lastName"
                    placeholder="Apellidos"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="age">Edad</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="-"
                    value={getAgeFromBirthDate(formData.birthDate) ?? ''}
                    disabled
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="sex">Sexo</Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value: SexValue) => setFormData(prev => ({ ...prev, sex: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Clinical info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-foreground">Información clínica</h3>
              <div className="form-field">
                <Label htmlFor="symptomsPathologies">Síntomas / Patologías</Label>
                <Textarea
                  id="symptomsPathologies"
                  placeholder="Describe los síntomas o patologías del paciente..."
                  value={formData.symptomsPathologies}
                  onChange={(e) => setFormData(prev => ({ ...prev, symptomsPathologies: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <Label htmlFor="surgicalInterventions">Intervenciones quirúrgicas</Label>
                <Textarea
                  id="surgicalInterventions"
                  placeholder="Lista de intervenciones quirúrgicas previas..."
                  value={formData.surgicalInterventions}
                  onChange={(e) => setFormData(prev => ({ ...prev, surgicalInterventions: e.target.value }))}
                />
              </div>
            </div>

            {/* Medical conditions */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-foreground">Condiciones médicas</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="hasPacemaker" className="cursor-pointer">Marcapasos</Label>
                  <Switch
                    id="hasPacemaker"
                    checked={formData.hasPacemaker}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasPacemaker: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="isPregnant" className="cursor-pointer">Embarazo</Label>
                  <Switch
                    id="isPregnant"
                    checked={formData.isPregnant}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPregnant: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="hasDiabetes" className="cursor-pointer">Diabetes</Label>
                  <Switch
                    id="hasDiabetes"
                    checked={formData.hasDiabetes}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasDiabetes: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="underMedicalTreatment" className="cursor-pointer">En tratamiento médico</Label>
                  <Switch
                    id="underMedicalTreatment"
                    checked={formData.underMedicalTreatment}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, underMedicalTreatment: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="chemotherapyOrRadiation" className="cursor-pointer">Quimioterapia / Rayos</Label>
                  <Switch
                    id="chemotherapyOrRadiation"
                    checked={formData.chemotherapyOrRadiation}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, chemotherapyOrRadiation: checked }))}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="bloodPressure">Tensión arterial</Label>
                  <Select
                    value={formData.bloodPressure}
                    onValueChange={(value: BloodPressureValue) => setFormData(prev => ({ ...prev, bloodPressure: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.chemotherapyOrRadiation && (
                <div className="form-field">
                  <Label htmlFor="lastChemoRadiationDate">Fecha última quimio/rayos</Label>
                  <Input
                    id="lastChemoRadiationDate"
                    type="date"
                    value={formData.lastChemoRadiationDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastChemoRadiationDate: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-field">
                <Label htmlFor="medications">Medicamentos</Label>
                <Textarea
                  id="medications"
                  placeholder="Lista de medicamentos actuales..."
                  value={formData.medications}
                  onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'Guardar cambios' : 'Crear paciente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
