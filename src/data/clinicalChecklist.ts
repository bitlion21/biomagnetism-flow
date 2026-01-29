import { ClinicalChecklistItem } from '@/types';

// Default clinical checklist items for therapy sessions
export const defaultClinicalChecklist: ClinicalChecklistItem[] = [
  { id: '1', label: 'Revisión de síntomas principales', checked: false },
  { id: '2', label: 'Verificación de contraindicaciones', checked: false },
  { id: '3', label: 'Rastreo de puntos reactivos', checked: false },
  { id: '4', label: 'Aplicación de pares biomagnéticos', checked: false },
  { id: '5', label: 'Verificación de neutralización', checked: false },
  { id: '6', label: 'Revisión de hidratación', checked: false },
  { id: '7', label: 'Recomendaciones post-sesión', checked: false },
  { id: '8', label: 'Programación de siguiente cita', checked: false },
];
