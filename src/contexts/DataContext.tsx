import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, Appointment, Session, BiomagneticPair } from '@/types';
import { initialBiomagneticPairs } from '@/data/biomagneticPairs';

interface DataContextType {
  // Patients
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatientById: (id: string) => Patient | undefined;
  getPatientByPhone: (phone: string) => Patient | undefined;
  
  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Appointment | null;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getAppointmentsByDate: (date: string) => Appointment[];
  canAddAppointmentOnDate: (date: string) => boolean;
  
  // Sessions
  sessions: Session[];
  addSession: (session: Omit<Session, 'id' | 'createdAt'>) => Session;
  updateSession: (id: string, data: Partial<Session>) => void;
  getSessionsByPatient: (patientId: string) => Session[];
  
  // Biomagnetic Pairs
  biomagneticPairs: BiomagneticPair[];
  addBiomagneticPair: (pair: Omit<BiomagneticPair, 'id'>) => BiomagneticPair;
  updateBiomagneticPair: (id: string, data: Partial<BiomagneticPair>) => void;
  deleteBiomagneticPair: (id: string) => void;
  deleteAllBiomagneticPairs: () => void;
  getPairsByPoint1: (point1: string) => BiomagneticPair[];
  getPairsByPoint: (point: string) => BiomagneticPair[];
  getUniquePoint1Values: () => string[];
  getUniquePointValues: () => string[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  patients: 'biomag_patients',
  appointments: 'biomag_appointments',
  sessions: 'biomag_sessions',
  pairs: 'biomag_pairs',
};

const MAX_APPOINTMENTS_PER_DAY = 4;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [biomagneticPairs, setBiomagneticPairs] = useState<BiomagneticPair[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedPatients = localStorage.getItem(STORAGE_KEYS.patients);
    const savedAppointments = localStorage.getItem(STORAGE_KEYS.appointments);
    const savedSessions = localStorage.getItem(STORAGE_KEYS.sessions);
    const savedPairs = localStorage.getItem(STORAGE_KEYS.pairs);

    if (savedPatients) setPatients(JSON.parse(savedPatients));
    if (savedAppointments) setAppointments(JSON.parse(savedAppointments));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedPairs) {
      setBiomagneticPairs(JSON.parse(savedPairs));
    } else {
      // Initialize with default pairs if none exist
      setBiomagneticPairs(initialBiomagneticPairs);
      localStorage.setItem(STORAGE_KEYS.pairs, JSON.stringify(initialBiomagneticPairs));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.pairs, JSON.stringify(biomagneticPairs));
  }, [biomagneticPairs]);

  // Patient functions
  const addPatient = (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient => {
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients(prev => prev.map(p => 
      p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ));
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
    // Also delete related appointments and sessions
    setAppointments(prev => prev.filter(a => a.patientId !== id));
    setSessions(prev => prev.filter(s => s.patientId !== id));
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);
  const getPatientByPhone = (phone: string) => patients.find(p => p.phone === phone);

  // Appointment functions
  const getAppointmentsByDate = (date: string) => 
    appointments.filter(a => a.date === date && a.status !== 'cancelled');

  const canAddAppointmentOnDate = (date: string) => 
    getAppointmentsByDate(date).length < MAX_APPOINTMENTS_PER_DAY;

  const addAppointment = (data: Omit<Appointment, 'id' | 'createdAt'>): Appointment | null => {
    if (!canAddAppointmentOnDate(data.date)) {
      return null;
    }
    const newAppointment: Appointment = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setAppointments(prev => [...prev, newAppointment]);
    return newAppointment;
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, ...data } : a
    ));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  // Session functions
  const addSession = (data: Omit<Session, 'id' | 'createdAt'>): Session => {
    const newSession: Session = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  };

  const updateSession = (id: string, data: Partial<Session>) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, ...data } : s
    ));
  };

  const getSessionsByPatient = (patientId: string) => 
    sessions.filter(s => s.patientId === patientId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  // Biomagnetic Pair functions
  const addBiomagneticPair = (data: Omit<BiomagneticPair, 'id'>): BiomagneticPair => {
    const newPair: BiomagneticPair = {
      ...data,
      id: generateId(),
    };
    setBiomagneticPairs(prev => [...prev, newPair]);
    return newPair;
  };

  const updateBiomagneticPair = (id: string, data: Partial<BiomagneticPair>) => {
    setBiomagneticPairs(prev => prev.map(p => 
      p.id === id ? { ...p, ...data } : p
    ));
  };

  const deleteBiomagneticPair = (id: string) => {
    setBiomagneticPairs(prev => prev.filter(p => p.id !== id));
  };

  const deleteAllBiomagneticPairs = () => {
    setBiomagneticPairs([]);
  };

  const getPairsByPoint1 = (point1: string) =>
    biomagneticPairs.filter(p => p.point1.toLowerCase() === point1.toLowerCase());

  const getPairsByPoint = (point: string) =>
    biomagneticPairs.filter(p => 
      p.point1.toLowerCase() === point.toLowerCase() || 
      p.point2.toLowerCase() === point.toLowerCase()
    );

  const getUniquePoint1Values = () => 
    [...new Set(biomagneticPairs.map(p => p.point1))].sort();

  const getUniquePointValues = () => 
    [...new Set([...biomagneticPairs.map(p => p.point1), ...biomagneticPairs.map(p => p.point2)])].sort();

  return (
    <DataContext.Provider value={{
      patients,
      addPatient,
      updatePatient,
      deletePatient,
      getPatientById,
      getPatientByPhone,
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      getAppointmentsByDate,
      canAddAppointmentOnDate,
      sessions,
      addSession,
      updateSession,
      getSessionsByPatient,
      biomagneticPairs,
      addBiomagneticPair,
      updateBiomagneticPair,
      deleteBiomagneticPair,
      deleteAllBiomagneticPairs,
      getPairsByPoint1,
      getPairsByPoint,
      getUniquePoint1Values,
      getUniquePointValues,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
