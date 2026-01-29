// Core data types for BioMag Therapy application

export interface Patient {
  id: string;
  phone: string; // Required, unique
  name?: string;
  lastName?: string;
  email?: string;
  photo?: string;
  firstAppointmentDate?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  symptomsPathologies?: string;
  surgicalInterventions?: string;
  hasPacemaker?: boolean;
  isPregnant?: boolean;
  hasDiabetes?: boolean;
  bloodPressure?: 'high' | 'low' | 'normal';
  underMedicalTreatment?: boolean;
  chemotherapyOrRadiation?: boolean;
  lastChemoRadiationDate?: string;
  medications?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutes
  patientId: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Session {
  id: string;
  patientId: string;
  appointmentId?: string;
  date: string;
  summary?: string;
  selectedPairs: SelectedPair[];
  clinicalChecklist: ClinicalChecklistItem[];
  freeNotes?: string;
  createdAt: string;
}

export interface SelectedPair {
  pairCode: string;
  point1: string;
  point2: string;
  notes?: string;
}

export interface ClinicalChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface BiomagneticPair {
  id: string;
  pairCode: string; // Unique code
  point1: string;
  point2: string;
  pathogen?: string;
  type?: string;
  symptoms?: string;
  group?: string;
  notes?: string;
}

// User type for simple auth
export interface User {
  username: string;
  isAuthenticated: boolean;
}

// App state types
export interface AppState {
  user: User | null;
  patients: Patient[];
  appointments: Appointment[];
  sessions: Session[];
  biomagneticPairs: BiomagneticPair[];
}
