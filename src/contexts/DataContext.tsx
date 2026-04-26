import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { Patient, Appointment, Session, BiomagneticPair, DiseaseCondition, ProtocolItem } from '@/types';
import { initialBiomagneticPairs } from '@/data/biomagneticPairs';
import { isHybridDataMode } from '@/lib/dataRuntime';
import { enqueueSyncMutation } from '@/lib/syncQueue';
import { fetchHybridBootstrap, syncPendingMutations } from '@/lib/syncClient';
import { useAuth } from '@/contexts/AuthContext';

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

  // Hybrid sync helpers
  rehydrateFromCloud: () => Promise<boolean>;
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

const getScopedStorageKey = (key: string, username: string) =>
  `${key}:${username.trim().toLowerCase()}`;

const BUNDLED_PAIRS_FILE = '/data/pares_biomagneticos_OK_rev.05.xlsx';
const BUNDLED_DISEASES_FILE = '/data/MedLinePlus_Enfermedades_v1.xlsx';

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
  keyPrefix: 'disease_conditions',
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

const getDiseaseConditionsFromIdb = async (username: string): Promise<DiseaseCondition[] | null> => {
  try {
    const db = await openDiseaseDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_CONFIG.store, 'readonly');
      const store = tx.objectStore(IDB_CONFIG.store);
      const req = store.get(getScopedStorageKey(IDB_CONFIG.keyPrefix, username));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

const setDiseaseConditionsToIdb = async (username: string, value: DiseaseCondition[]) => {
  try {
    const db = await openDiseaseDb();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
      const store = tx.objectStore(IDB_CONFIG.store);
      store.put(value, getScopedStorageKey(IDB_CONFIG.keyPrefix, username));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

type PairRow = Record<string, unknown>;
type GenericRow = Record<string, unknown>;

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isProtocolHeaderRow = (columns: string[]) => {
  const first = normalizeText(columns[0]);
  const second = normalizeText(columns[1]);
  const third = normalizeText(columns[2]);
  const fourth = normalizeText(columns[3]);

  return (
    (first === 'numero' || first === 'número' || first === 'codigo' || first === 'código') &&
    (second === 'par' || second === 'enfermedad' || second === 'par/enfermedad') &&
    (third === 'grupo' || third === 'group') &&
    (fourth === 'protocolo' || fourth === 'tipo' || fourth === 'categoria' || fourth === 'clase')
  );
};

const sanitizeProtocolItems = (items: ProtocolItem[]) =>
  items.filter((item) => !isProtocolHeaderRow(item.columns ?? []));

const PAIR_COLUMN_MAPPINGS: Record<string, keyof Omit<BiomagneticPair, 'id'>> = {
  codigo: 'pairCode',
  'código': 'pairCode',
  code: 'pairCode',
  paircode: 'pairCode',
  'punto 1': 'point1',
  punto1: 'point1',
  point1: 'point1',
  'point 1': 'point1',
  'punto 2': 'point2',
  punto2: 'point2',
  point2: 'point2',
  'point 2': 'point2',
  nombre: 'name',
  name: 'name',
  relacion: 'relation',
  'relación': 'relation',
  relation: 'relation',
  patogeno: 'pathogen',
  'patógeno': 'pathogen',
  pathogen: 'pathogen',
  tipo: 'type',
  type: 'type',
  sintomatologia: 'symptoms',
  'sintomatología': 'symptoms',
  sintomas: 'symptoms',
  'síntomas': 'symptoms',
  symptoms: 'symptoms',
  recomendaciones: 'recommendations',
  recommendation: 'recommendations',
  recommendations: 'recommendations',
};

const parsePairsFromWorkbook = (workbook: XLSX.WorkBook): Omit<BiomagneticPair, 'id'>[] => {
  const worksheet = workbook.Sheets['01.Pares'];
  if (!worksheet) return [];

  const jsonRows = XLSX.utils.sheet_to_json<PairRow>(worksheet, { defval: '' });
  return jsonRows
    .map((row) => {
      const pair: Partial<Omit<BiomagneticPair, 'id'>> = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = PAIR_COLUMN_MAPPINGS[key.toLowerCase().trim()];
        if (!mappedKey) return;
        const textValue = String(value ?? '').trim();
        if (!textValue) return;
        (pair as Record<string, string>)[mappedKey] = textValue;
      });

      if (!pair.point1 || !pair.point2) return null;
      if (!pair.pairCode) return null;

      return {
        pairCode: pair.pairCode,
        point1: pair.point1,
        point2: pair.point2,
        name: pair.name,
        relation: pair.relation,
        pathogen: pair.pathogen,
        type: pair.type,
        symptoms: pair.symptoms,
        recommendations: pair.recommendations,
      } as Omit<BiomagneticPair, 'id'>;
    })
    .filter(Boolean) as Omit<BiomagneticPair, 'id'>[];
};

const parseProtocolsFromWorkbook = (workbook: XLSX.WorkBook): Array<Omit<ProtocolItem, 'id'>> => {
  const worksheet = workbook.Sheets['02.Protocolos'];
  if (!worksheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
  return rows
    .map((row) => (Array.isArray(row) ? row : []))
    .map((row) => row.map((cell) => String(cell ?? '').replace(/\s+/g, ' ').trim()))
    .filter((columns) => columns.some(Boolean))
    .filter((columns) => !isProtocolHeaderRow(columns))
    .map((columns) => ({
      columns,
      group: columns[2] || '',
      protocolCategory: columns[3] || '',
    }));
};

const getFirstColumnValue = (row: GenericRow) => {
  const firstKey = Object.keys(row)[0];
  return firstKey ? row[firstKey] : undefined;
};

const parseDiseaseConditionsFromWorkbook = (workbook: XLSX.WorkBook): Array<Omit<DiseaseCondition, 'id'>> => {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];

  const rows = XLSX.utils.sheet_to_json<GenericRow>(worksheet, { defval: '' });
  return rows
    .map((row) => {
      const normalizedRow = Object.entries(row).reduce<GenericRow>((acc, [key, value]) => {
        acc[key.toLowerCase().trim()] = value;
        return acc;
      }, {});

      const name =
        normalizedRow['nombre'] ||
        normalizedRow['enfermedad'] ||
        normalizedRow['afeccion'] ||
        normalizedRow['afecion'] ||
        normalizedRow['nombre_enfermedad'] ||
        normalizedRow['name'] ||
        normalizedRow['disease'] ||
        getFirstColumnValue(row);
      const description =
        normalizedRow['texto'] ||
        normalizedRow['descripcion'] ||
        normalizedRow['descripción'] ||
        normalizedRow['notas'] ||
        normalizedRow['notes'] ||
        normalizedRow['description'];
      const letter = normalizedRow['letra'];
      const url = normalizedRow['url'] || normalizedRow['enlace'];

      const cleanName = typeof name === 'string' ? name.trim() : String(name ?? '').trim();
      if (!cleanName) return null;

      return {
        name: cleanName,
        description: typeof description === 'string' ? description.trim() : undefined,
        letter: typeof letter === 'string' ? letter.trim().toUpperCase() : cleanName.charAt(0).toUpperCase(),
        url: typeof url === 'string' ? url.trim() : undefined,
      } as Omit<DiseaseCondition, 'id'>;
    })
    .filter(Boolean) as Array<Omit<DiseaseCondition, 'id'>>;
};

const isPatientRecord = (value: unknown): value is Patient =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as Patient).id === 'string' &&
  typeof (value as Patient).phone === 'string';

const isAppointmentRecord = (value: unknown): value is Appointment =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as Appointment).id === 'string' &&
  typeof (value as Appointment).patientId === 'string' &&
  typeof (value as Appointment).date === 'string' &&
  typeof (value as Appointment).time === 'string';

const isSessionRecord = (value: unknown): value is Session =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as Session).id === 'string' &&
  typeof (value as Session).patientId === 'string' &&
  typeof (value as Session).date === 'string';


function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const currentUsername = user?.username?.trim().toLowerCase();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [biomagneticPairs, setBiomagneticPairs] = useState<BiomagneticPair[]>([]);
  const [diseaseConditions, setDiseaseConditions] = useState<DiseaseCondition[]>([]);
  const [protocolItems, setProtocolItems] = useState<ProtocolItem[]>([]);

  const loadBundledPairsAndProtocols = async (options: { loadPairs: boolean; loadProtocols: boolean }) => {
    if (!options.loadPairs && !options.loadProtocols) return;

    try {
      const response = await fetch(BUNDLED_PAIRS_FILE);
      if (!response.ok) return;
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (options.loadPairs) {
        const parsedPairs = parsePairsFromWorkbook(workbook);
        if (parsedPairs.length > 0) {
          setBiomagneticPairs(parsedPairs.map((pair) => ({ ...pair, id: generateId() })));
        }
      }

      if (options.loadProtocols) {
        const parsedProtocols = parseProtocolsFromWorkbook(workbook);
        setProtocolItems(parsedProtocols.map((item) => ({ ...item, id: generateId() })));
      }
    } catch {
      // Fall back to current behavior if bundled files are unavailable
    }
  };

  const loadBundledDiseaseConditions = async () => {
    try {
      const response = await fetch(BUNDLED_DISEASES_FILE);
      if (!response.ok) return;
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const parsedDiseases = parseDiseaseConditionsFromWorkbook(workbook);
      if (parsedDiseases.length > 0) {
        setDiseaseConditions(
          parsedDiseases.map((item, index) => ({
            ...item,
            id: `seed-disease-${index}-${Date.now().toString(36)}`,
          }))
        );
      }
    } catch {
      // Ignore bundled disease loading errors
    }
  };

  const rehydrateFromCloud = async (): Promise<boolean> => {
    if (!isHybridDataMode() || !currentUsername) return false;

    const bootstrap = await fetchHybridBootstrap(currentUsername);
    if (!bootstrap.ok) return false;

    if (Array.isArray(bootstrap.patients)) {
      setPatients(ensureFixedPatient(bootstrap.patients.filter(isPatientRecord)));
    }
    if (Array.isArray(bootstrap.appointments)) {
      setAppointments(ensureFixedAppointment(bootstrap.appointments.filter(isAppointmentRecord)));
    }
    if (Array.isArray(bootstrap.sessions)) {
      setSessions(bootstrap.sessions.filter(isSessionRecord));
    }
    return true;
  };

  // Load user-scoped data whenever auth user changes.
  useEffect(() => {
    if (isLoading) return;

    if (!currentUsername) {
      setPatients([]);
      setAppointments([]);
      setSessions([]);
      setBiomagneticPairs([]);
      setDiseaseConditions([]);
      setProtocolItems([]);
      return;
    }

    const patientKey = getScopedStorageKey(STORAGE_KEYS.patients, currentUsername);
    const appointmentKey = getScopedStorageKey(STORAGE_KEYS.appointments, currentUsername);
    const sessionKey = getScopedStorageKey(STORAGE_KEYS.sessions, currentUsername);
    const pairKey = getScopedStorageKey(STORAGE_KEYS.pairs, currentUsername);
    const protocolKey = getScopedStorageKey(STORAGE_KEYS.protocolItems, currentUsername);

    const savedPatients = localStorage.getItem(patientKey);
    const savedAppointments = localStorage.getItem(appointmentKey);
    const savedSessions = localStorage.getItem(sessionKey);
    const savedPairs = localStorage.getItem(pairKey);
    const savedProtocolItems = localStorage.getItem(protocolKey);

    setPatients(savedPatients ? ensureFixedPatient(JSON.parse(savedPatients)) : ensureFixedPatient([]));
    setAppointments(savedAppointments ? ensureFixedAppointment(JSON.parse(savedAppointments)) : ensureFixedAppointment([]));
    setSessions(savedSessions ? JSON.parse(savedSessions) : []);

    if (savedPairs) {
      setBiomagneticPairs(JSON.parse(savedPairs));
    } else {
      setBiomagneticPairs(initialBiomagneticPairs);
      localStorage.setItem(pairKey, JSON.stringify(initialBiomagneticPairs));
    }

    if (savedProtocolItems) {
      setProtocolItems(sanitizeProtocolItems(JSON.parse(savedProtocolItems)));
    } else {
      setProtocolItems([]);
    }

    void loadBundledPairsAndProtocols({
      loadPairs: !savedPairs,
      loadProtocols: !savedProtocolItems,
    });

    if (isHybridDataMode()) {
      void (async () => {
        const bootstrap = await fetchHybridBootstrap(currentUsername);
        if (!bootstrap.ok) return;

        if (!savedPatients && Array.isArray(bootstrap.patients)) {
          setPatients(ensureFixedPatient(bootstrap.patients.filter(isPatientRecord)));
        }
        if (!savedAppointments && Array.isArray(bootstrap.appointments)) {
          setAppointments(ensureFixedAppointment(bootstrap.appointments.filter(isAppointmentRecord)));
        }
        if (!savedSessions && Array.isArray(bootstrap.sessions)) {
          setSessions(bootstrap.sessions.filter(isSessionRecord));
        }
      })();
    }
  }, [currentUsername, isLoading]);

  useEffect(() => {
    if (!currentUsername) return;
    let isMounted = true;
    const loadDiseaseConditions = async () => {
      const fromIdb = await getDiseaseConditionsFromIdb(currentUsername);
      if (fromIdb && isMounted) {
        setDiseaseConditions(fromIdb);
        return;
      }
      const savedDiseaseConditions = localStorage.getItem(getScopedStorageKey(STORAGE_KEYS.diseaseConditions, currentUsername));
      if (savedDiseaseConditions && isMounted) {
        const parsed = JSON.parse(savedDiseaseConditions);
        setDiseaseConditions(parsed);
        setDiseaseConditionsToIdb(currentUsername, parsed);
        return;
      }

      if (isMounted) {
        await loadBundledDiseaseConditions();
      }
    };
    loadDiseaseConditions();
    return () => {
      isMounted = false;
    };
  }, [currentUsername]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!currentUsername) return;
    localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.patients, currentUsername), JSON.stringify(patients));
  }, [currentUsername, patients]);

  useEffect(() => {
    if (!currentUsername) return;
    localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.appointments, currentUsername), JSON.stringify(appointments));
  }, [appointments, currentUsername]);

  useEffect(() => {
    if (!currentUsername) return;
    localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.sessions, currentUsername), JSON.stringify(sessions));
  }, [currentUsername, sessions]);

  useEffect(() => {
    if (!currentUsername) return;
    localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.pairs, currentUsername), JSON.stringify(biomagneticPairs));
  }, [biomagneticPairs, currentUsername]);

  useEffect(() => {
    if (!currentUsername) return;
    setDiseaseConditionsToIdb(currentUsername, diseaseConditions);
    try {
      localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.diseaseConditions, currentUsername), JSON.stringify(diseaseConditions));
    } catch {
      // ignore localStorage quota errors
    }
  }, [currentUsername, diseaseConditions]);

  useEffect(() => {
    if (!currentUsername) return;
    localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.protocolItems, currentUsername), JSON.stringify(protocolItems));
  }, [currentUsername, protocolItems]);

  useEffect(() => {
    if (!isHybridDataMode() || !currentUsername) return;

    void syncPendingMutations(currentUsername);

    const onOnline = () => {
      void syncPendingMutations(currentUsername);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncPendingMutations(currentUsername);
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentUsername]);

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
    enqueueSyncMutation(currentUsername, {
      entity: 'patients',
      action: 'upsert',
      recordId: newPatient.id,
      payload: newPatient as unknown as Record<string, unknown>,
    });
    return newPatient;
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    if (id === FIXED_PATIENT_ID) {
      setPatients(prev => ensureFixedPatient(prev));
      return;
    }
    const nextUpdatedAt = new Date().toISOString();
    const current = patients.find(p => p.id === id);
    const nextRecord = current ? { ...current, ...data, updatedAt: nextUpdatedAt } : { id, ...data, updatedAt: nextUpdatedAt };
    setPatients(prev => prev.map(p => 
      p.id === id ? (nextRecord as Patient) : p
    ));
    enqueueSyncMutation(currentUsername, {
      entity: 'patients',
      action: 'upsert',
      recordId: id,
      payload: nextRecord as unknown as Record<string, unknown>,
    });
  };

  const deletePatient = (id: string) => {
    if (id === FIXED_PATIENT_ID) return;
    const relatedAppointmentIds = appointments.filter(a => a.patientId === id).map(a => a.id);
    const relatedSessionIds = sessions.filter(s => s.patientId === id).map(s => s.id);
    setPatients(prev => prev.filter(p => p.id !== id));
    // Also delete related appointments and sessions
    setAppointments(prev => prev.filter(a => a.patientId !== id));
    setSessions(prev => prev.filter(s => s.patientId !== id));
    enqueueSyncMutation(currentUsername, {
      entity: 'patients',
      action: 'delete',
      recordId: id,
    });
    relatedAppointmentIds.forEach((appointmentId) => {
      enqueueSyncMutation(currentUsername, {
        entity: 'appointments',
        action: 'delete',
        recordId: appointmentId,
      });
    });
    relatedSessionIds.forEach((sessionId) => {
      enqueueSyncMutation(currentUsername, {
        entity: 'sessions',
        action: 'delete',
        recordId: sessionId,
      });
    });
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
    enqueueSyncMutation(currentUsername, {
      entity: 'appointments',
      action: 'upsert',
      recordId: newAppointment.id,
      payload: newAppointment as unknown as Record<string, unknown>,
    });
    return newAppointment;
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    if (id === FIXED_APPOINTMENT_ID) {
      setAppointments(prev => ensureFixedAppointment(prev));
      return;
    }
    const current = appointments.find(a => a.id === id);
    const nextRecord = current ? { ...current, ...data } : { id, ...data };
    setAppointments(prev => prev.map(a => 
      a.id === id ? (nextRecord as Appointment) : a
    ));
    enqueueSyncMutation(currentUsername, {
      entity: 'appointments',
      action: 'upsert',
      recordId: id,
      payload: nextRecord as unknown as Record<string, unknown>,
    });
  };

  const deleteAppointment = (id: string) => {
    if (id === FIXED_APPOINTMENT_ID) return;
    setAppointments(prev => prev.filter(a => a.id !== id));
    enqueueSyncMutation(currentUsername, {
      entity: 'appointments',
      action: 'delete',
      recordId: id,
    });
  };

  // Session functions
  const addSession = (data: Omit<Session, 'id' | 'createdAt'>): Session => {
    const newSession: Session = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    enqueueSyncMutation(currentUsername, {
      entity: 'sessions',
      action: 'upsert',
      recordId: newSession.id,
      payload: newSession as unknown as Record<string, unknown>,
    });
    return newSession;
  };

  const updateSession = (id: string, data: Partial<Session>) => {
    const current = sessions.find(s => s.id === id);
    const nextRecord = current ? { ...current, ...data } : { id, ...data };
    setSessions(prev => prev.map(s => 
      s.id === id ? (nextRecord as Session) : s
    ));
    enqueueSyncMutation(currentUsername, {
      entity: 'sessions',
      action: 'upsert',
      recordId: id,
      payload: nextRecord as unknown as Record<string, unknown>,
    });
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
    setProtocolItems(sanitizeProtocolItems(items));
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
      rehydrateFromCloud,
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
