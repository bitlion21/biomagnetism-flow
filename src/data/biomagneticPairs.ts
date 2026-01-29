import { BiomagneticPair } from '@/types';

// Initial set of biomagnetic pairs for the knowledge base
export const initialBiomagneticPairs: BiomagneticPair[] = [
  {
    id: '1',
    pairCode: 'PAR-001',
    point1: 'Temporal Derecho',
    point2: 'Temporal Izquierdo',
    pathogen: 'Meningococo',
    type: 'Bacteria',
    symptoms: 'Dolor de cabeza, rigidez de cuello, fiebre',
    group: 'Cabeza',
    notes: 'Par clásico para meningitis bacteriana'
  },
  {
    id: '2',
    pairCode: 'PAR-002',
    point1: 'Parietal Derecho',
    point2: 'Parietal Izquierdo',
    pathogen: 'Neumococo',
    type: 'Bacteria',
    symptoms: 'Neumonía, sinusitis, otitis',
    group: 'Cabeza',
    notes: 'Relacionado con infecciones respiratorias superiores'
  },
  {
    id: '3',
    pairCode: 'PAR-003',
    point1: 'Occipital',
    point2: 'Occipital',
    pathogen: 'Toxoplasma',
    type: 'Parásito',
    symptoms: 'Fatiga, dolores musculares, confusión',
    group: 'Cabeza',
    notes: 'Común en contacto con gatos'
  },
  {
    id: '4',
    pairCode: 'PAR-004',
    point1: 'Tiroides',
    point2: 'Timo',
    pathogen: 'Virus Epstein-Barr',
    type: 'Virus',
    symptoms: 'Fatiga crónica, inflamación de ganglios',
    group: 'Cuello',
    notes: 'Relacionado con mononucleosis'
  },
  {
    id: '5',
    pairCode: 'PAR-005',
    point1: 'Hígado',
    point2: 'Riñón Derecho',
    pathogen: 'Hepatitis C',
    type: 'Virus',
    symptoms: 'Fatiga, dolor abdominal, ictericia',
    group: 'Tronco',
    notes: 'Revisar función hepática'
  },
  {
    id: '6',
    pairCode: 'PAR-006',
    point1: 'Estómago',
    point2: 'Suprarrenal Izquierda',
    pathogen: 'Helicobacter pylori',
    type: 'Bacteria',
    symptoms: 'Gastritis, úlceras, reflujo',
    group: 'Tronco',
    notes: 'Par muy frecuente en problemas digestivos'
  },
  {
    id: '7',
    pairCode: 'PAR-007',
    point1: 'Bazo',
    point2: 'Hígado',
    pathogen: 'Plasmodium',
    type: 'Parásito',
    symptoms: 'Fiebre intermitente, anemia, esplenomegalia',
    group: 'Tronco',
    notes: 'Relacionado con malaria'
  },
  {
    id: '8',
    pairCode: 'PAR-008',
    point1: 'Colon Descendente',
    point2: 'Colon Ascendente',
    pathogen: 'Candida albicans',
    type: 'Hongo',
    symptoms: 'Distensión abdominal, gases, diarrea/estreñimiento',
    group: 'Tronco',
    notes: 'Muy común en desequilibrios intestinales'
  },
  {
    id: '9',
    pairCode: 'PAR-009',
    point1: 'Vejiga',
    point2: 'Riñón Izquierdo',
    pathogen: 'E. coli',
    type: 'Bacteria',
    symptoms: 'Infección urinaria, dolor al orinar',
    group: 'Pelvis',
    notes: 'Común en cistitis recurrente'
  },
  {
    id: '10',
    pairCode: 'PAR-010',
    point1: 'Rodilla Derecha',
    point2: 'Rodilla Izquierda',
    pathogen: 'Chlamydia',
    type: 'Bacteria',
    symptoms: 'Artritis, dolor articular',
    group: 'Extremidades',
    notes: 'Puede causar artritis reactiva'
  },
  {
    id: '11',
    pairCode: 'PAR-011',
    point1: 'Pulmón Derecho',
    point2: 'Pulmón Izquierdo',
    pathogen: 'Mycobacterium',
    type: 'Bacteria',
    symptoms: 'Tos crónica, dificultad respiratoria',
    group: 'Tórax',
    notes: 'Relacionado con tuberculosis'
  },
  {
    id: '12',
    pairCode: 'PAR-012',
    point1: 'Corazón',
    point2: 'Pericardio',
    pathogen: 'Coxsackie virus',
    type: 'Virus',
    symptoms: 'Dolor torácico, arritmias, fatiga',
    group: 'Tórax',
    notes: 'Puede causar miocarditis viral'
  },
  {
    id: '13',
    pairCode: 'PAR-013',
    point1: 'Suprarrenal Derecha',
    point2: 'Suprarrenal Izquierda',
    pathogen: 'Citomegalovirus',
    type: 'Virus',
    symptoms: 'Fatiga extrema, debilidad, fiebre prolongada',
    group: 'Tronco',
    notes: 'Relacionado con inmunosupresión'
  },
  {
    id: '14',
    pairCode: 'PAR-014',
    point1: 'Páncreas',
    point2: 'Duodeno',
    pathogen: 'Giardia',
    type: 'Parásito',
    symptoms: 'Diarrea, malabsorción, pérdida de peso',
    group: 'Tronco',
    notes: 'Común en agua contaminada'
  },
  {
    id: '15',
    pairCode: 'PAR-015',
    point1: 'Hipófisis',
    point2: 'Hipotálamo',
    pathogen: 'Herpes zóster',
    type: 'Virus',
    symptoms: 'Desequilibrios hormonales, dolor neuropático',
    group: 'Cabeza',
    notes: 'Eje neuroendocrino'
  },
];
