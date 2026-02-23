import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, Appointment, Session, BiomagneticPair, DiseaseCondition, ProtocolItem } from '@/types';
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

  // Disease conditions
  diseaseConditions: DiseaseCondition[];
  replaceDiseaseConditions: (items: DiseaseCondition[]) => void;

  // Protocols
  protocolItems: ProtocolItem[];
  replaceProtocolItems: (items: ProtocolItem[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  patients: 'biomag_patients',
  appointments: 'biomag_appointments',
  sessions: 'biomag_sessions',
  pairs: 'biomag_pairs',
  diseaseConditions: 'biomag_disease_conditions',
  protocolItems: 'biomag_protocol_items',
};

export const FIXED_PATIENT_ID = 'fixed-patient-0';
export const FIXED_PATIENT_PHONE = '+34 600 000 000';
export const FIXED_APPOINTMENT_ID = 'fixed-appointment-patient-0-2050-01-01-0800';

const FIXED_PATIENT_CREATED_AT = '2026-01-01T00:00:00.000Z';
const FIXED_APPOINTMENT_CREATED_AT = '2026-01-01T00:00:00.000Z';

const buildFixedPatient = (): Patient => ({
  id: FIXED_PATIENT_ID,
  phone: FIXED_PATIENT_PHONE,
  name: 'Paciente 0',
  lastName: 'Test',
  email: 'pacientecero@biomag.es',
  birthDate: '2000-01-01',
  sex: 'male',
  createdAt: FIXED_PATIENT_CREATED_AT,
  updatedAt: FIXED_PATIENT_CREATED_AT,
});

const buildFixedAppointment = (): Appointment => ({
  id: FIXED_APPOINTMENT_ID,
  patientId: FIXED_PATIENT_ID,
  date: '2050-01-01',
  time: '08:00',
  duration: 60,
  status: 'scheduled',
  createdAt: FIXED_APPOINTMENT_CREATED_AT,
});

const ensureFixedPatient = (items: Patient[]): Patient[] => {
  const rest = items.filter(
    (patient) => patient.id !== FIXED_PATIENT_ID && patient.phone !== FIXED_PATIENT_PHONE
  );
  return [...rest, buildFixedPatient()];
};

const ensureFixedAppointment = (items: Appointment[]): Appointment[] => {
  const rest = items.filter((appointment) => {
    const isSameFixedSlot =
      appointment.patientId === FIXED_PATIENT_ID &&
      appointment.date === '2050-01-01' &&
      appointment.time === '08:00';
    return appointment.id !== FIXED_APPOINTMENT_ID && !isSameFixedSlot;
  });
  return [...rest, buildFixedAppointment()];
};

const IDB_CONFIG = {
  name: 'biomag_app',
  store: 'kv',
  key: 'disease_conditions',
};

const openDiseaseDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_CONFIG.name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_CONFIG.store)) {
        db.createObjectStore(IDB_CONFIG.store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getDiseaseConditionsFromIdb = async (): Promise<DiseaseCondition[] | null> => {
  try {
    const db = await openDiseaseDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_CONFIG.store, 'readonly');
      const store = tx.objectStore(IDB_CONFIG.store);
      const req = store.get(IDB_CONFIG.key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

const setDiseaseConditionsToIdb = async (value: DiseaseCondition[]) => {
  try {
    const db = await openDiseaseDb();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
      const store = tx.objectStore(IDB_CONFIG.store);
      store.put(value, IDB_CONFIG.key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};


function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [biomagneticPairs, setBiomagneticPairs] = useState<BiomagneticPair[]>([]);
  const [diseaseConditions, setDiseaseConditions] = useState<DiseaseCondition[]>([]);
  const [protocolItems, setProtocolItems] = useState<ProtocolItem[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedPatients = localStorage.getItem(STORAGE_KEYS.patients);
    const savedAppointments = localStorage.getItem(STORAGE_KEYS.appointments);
    const savedSessions = localStorage.getItem(STORAGE_KEYS.sessions);
    const savedPairs = localStorage.getItem(STORAGE_KEYS.pairs);
    const savedProtocolItems = localStorage.getItem(STORAGE_KEYS.protocolItems);

    if (savedPatients) {
      setPatients(ensureFixedPatient(JSON.parse(savedPatients)));
    } else {
      setPatients(ensureFixedPatient([]));
    }
    if (savedAppointments) {
      setAppointments(ensureFixedAppointment(JSON.parse(savedAppointments)));
    } else {
      setAppointments(ensureFixedAppointment([]));
    }
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedPairs) {
      setBiomagneticPairs(JSON.parse(savedPairs));
    } else {
      // Initialize with default pairs if none exist
      setBiomagneticPairs(initialBiomagneticPairs);
      localStorage.setItem(STORAGE_KEYS.pairs, JSON.stringify(initialBiomagneticPairs));
    }
    if (savedProtocolItems) setProtocolItems(JSON.parse(savedProtocolItems));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadDiseaseConditions = async () => {
      const fromIdb = await getDiseaseConditionsFromIdb();
      if (fromIdb && isMounted) {
        setDiseaseConditions(fromIdb);
        return;
      }
      const savedDiseaseConditions = localStorage.getItem(STORAGE_KEYS.diseaseConditions);
      if (savedDiseaseConditions && isMounted) {
        const parsed = JSON.parse(savedDiseaseConditions);
        setDiseaseConditions(parsed);
        setDiseaseConditionsToIdb(parsed);
      }
    };
    loadDiseaseConditions();
    return () => {
      isMounted = false;
    };
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

  useEffect(() => {
    setDiseaseConditionsToIdb(diseaseConditions);
    try {
      localStorage.setItem(STORAGE_KEYS.diseaseConditions, JSON.stringify(diseaseConditions));
    } catch {
      // ignore localStorage quota errors
    }
  }, [diseaseConditions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.protocolItems, JSON.stringify(protocolItems));
  }, [protocolItems]);

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
    if (id === FIXED_PATIENT_ID) {
      setPatients(prev => ensureFixedPatient(prev));
      return;
    }
    setPatients(prev => prev.map(p => 
      p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ));
  };

  const deletePatient = (id: string) => {
    if (id === FIXED_PATIENT_ID) return;
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

  const canAddAppointmentOnDate = (date: string) => true;

  const addAppointment = (data: Omit<Appointment, 'id' | 'createdAt'>): Appointment | null => {
    if (
      data.patientId === FIXED_PATIENT_ID &&
      data.date === '2050-01-01' &&
      data.time === '08:00'
    ) {
      return appointments.find(a => a.id === FIXED_APPOINTMENT_ID) || buildFixedAppointment();
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
    if (id === FIXED_APPOINTMENT_ID) {
      setAppointments(prev => ensureFixedAppointment(prev));
      return;
    }
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, ...data } : a
    ));
  };

  const deleteAppointment = (id: string) => {
    if (id === FIXED_APPOINTMENT_ID) return;
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

  const replaceDiseaseConditions = (items: DiseaseCondition[]) => {
    setDiseaseConditions(items);
  };

  const replaceProtocolItems = (items: ProtocolItem[]) => {
    setProtocolItems(items);
  };

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
      diseaseConditions,
      replaceDiseaseConditions,
      protocolItems,
      replaceProtocolItems,
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
