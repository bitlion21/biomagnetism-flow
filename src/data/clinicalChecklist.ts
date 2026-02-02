import { ClinicalChecklistItem } from '@/types';

// Default clinical checklist items for therapy sessions
export const defaultClinicalChecklist: ClinicalChecklistItem[] = [
  { id: '1', label: 'Revisión histórico de pares', checked: false },
  { id: '2', label: 'Determinar estado actual del paciente', checked: false },
  { id: '3', label: 'Rastreo etiológico', checked: false },
  { id: '4', label: 'Rastreo lógico', checked: false },
  { id: '5', label: 'Recomendaciones post-sesión', checked: false },
  { id: '6', label: 'Programar siguiente cita', checked: false },
];
