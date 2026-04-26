// Core data types for BioMag Therapy application

export interface Patient {
  id: string;
  phone: string; // Required, unique
  name?: string;
  lastName?: string;
  email?: string;
  photo?: string;
  birthDate?: string; // YYYY-MM-DD
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
  source?: 'manual' | 'protocol';
}

export interface ClinicalChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface BiomagneticPair {
  id: string;
  pairCode: string; // Unique code (CODIGO)
  point1: string; // PUNTO 1
  point2: string; // PUNTO 2
  name?: string; // NOMBRE
  relation?: string; // RELACION
  pathogen?: string; // PATOGENO
  type?: string; // TIPO
  symptoms?: string; // SINTOMATOLOGIA
  recommendations?: string; // RECOMENDACIONES
}

export interface DiseaseCondition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  letter?: string;
  url?: string;
}

export interface ProtocolItem {
  id: string;
  columns: string[];
  group?: string; // 3ra columna
  protocolCategory?: string; // 4ta columna
}

export type UserRole = 'admin' | 'therapist';
export type UserStatus = 'pending' | 'approved' | 'disabled' | 'rejected';

export interface AuthAccount {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedAt?: string;
}

// User type for auth session
export interface User {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  isAuthenticated: boolean;
}

// App state types
export interface AppState {
  user: User | null;
  patients: Patient[];
  appointments: Appointment[];
  sessions: Session[];
  biomagneticPairs: BiomagneticPair[];
  diseaseConditions: DiseaseCondition[];
  protocolItems: ProtocolItem[];
}
