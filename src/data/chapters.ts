// NCERT Class 12 chapters (current rationalised textbooks).
// Chapter IDs are stable keys: never renumber them, or saved ticks will point at the wrong chapter.

export type SubjectKey = 'phy' | 'che' | 'mat' | 'bio';

export type Chapter = {
  id: string; // e.g. "phy-01"
  subject: SubjectKey;
  no: number; // chapter number in the book
  part: 'Part I' | 'Part II' | null;
  name: string;
};

export type Subject = {
  key: SubjectKey;
  name: string;
  short: string;
  chapters: Chapter[];
};

export const SYLLABUS_VERSION = 1;

function build(subject: SubjectKey, rows: [Chapter['part'], string][]): Chapter[] {
  return rows.map(([part, name], i) => ({
    id: `${subject}-${String(i + 1).padStart(2, '0')}`,
    subject,
    no: i + 1,
    part,
    name,
  }));
}

export const SUBJECTS: Subject[] = [
  {
    key: 'phy',
    name: 'Physics',
    short: 'Phy',
    chapters: build('phy', [
      ['Part I', 'Electric Charges and Fields'],
      ['Part I', 'Electrostatic Potential and Capacitance'],
      ['Part I', 'Current Electricity'],
      ['Part I', 'Moving Charges and Magnetism'],
      ['Part I', 'Magnetism and Matter'],
      ['Part I', 'Electromagnetic Induction'],
      ['Part I', 'Alternating Current'],
      ['Part I', 'Electromagnetic Waves'],
      ['Part II', 'Ray Optics and Optical Instruments'],
      ['Part II', 'Wave Optics'],
      ['Part II', 'Dual Nature of Radiation and Matter'],
      ['Part II', 'Atoms'],
      ['Part II', 'Nuclei'],
      ['Part II', 'Semiconductor Electronics: Materials, Devices and Simple Circuits'],
    ]),
  },
  {
    key: 'che',
    name: 'Chemistry',
    short: 'Chem',
    chapters: build('che', [
      ['Part I', 'Solutions'],
      ['Part I', 'Electrochemistry'],
      ['Part I', 'Chemical Kinetics'],
      ['Part I', 'The d- and f-Block Elements'],
      ['Part I', 'Coordination Compounds'],
      ['Part II', 'Haloalkanes and Haloarenes'],
      ['Part II', 'Alcohols, Phenols and Ethers'],
      ['Part II', 'Aldehydes, Ketones and Carboxylic Acids'],
      ['Part II', 'Amines'],
      ['Part II', 'Biomolecules'],
    ]),
  },
  {
    key: 'mat',
    name: 'Maths',
    short: 'Maths',
    chapters: build('mat', [
      ['Part I', 'Relations and Functions'],
      ['Part I', 'Inverse Trigonometric Functions'],
      ['Part I', 'Matrices'],
      ['Part I', 'Determinants'],
      ['Part I', 'Continuity and Differentiability'],
      ['Part I', 'Application of Derivatives'],
      ['Part II', 'Integrals'],
      ['Part II', 'Application of Integrals'],
      ['Part II', 'Differential Equations'],
      ['Part II', 'Vector Algebra'],
      ['Part II', 'Three Dimensional Geometry'],
      ['Part II', 'Linear Programming'],
      ['Part II', 'Probability'],
    ]),
  },
  {
    key: 'bio',
    name: 'Biology',
    short: 'Bio',
    chapters: build('bio', [
      [null, 'Sexual Reproduction in Flowering Plants'],
      [null, 'Human Reproduction'],
      [null, 'Reproductive Health'],
      [null, 'Principles of Inheritance and Variation'],
      [null, 'Molecular Basis of Inheritance'],
      [null, 'Evolution'],
      [null, 'Human Health and Disease'],
      [null, 'Microbes in Human Welfare'],
      [null, 'Biotechnology: Principles and Processes'],
      [null, 'Biotechnology and its Applications'],
      [null, 'Organisms and Populations'],
      [null, 'Ecosystem'],
      [null, 'Biodiversity and Conservation'],
    ]),
  },
];

export const SUBJECT_BY_KEY: Record<SubjectKey, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.key, s]),
) as Record<SubjectKey, Subject>;

export const ALL_CHAPTERS: Chapter[] = SUBJECTS.flatMap((s) => s.chapters);

export const STREAMS: { label: string; subjects: SubjectKey[] }[] = [
  { label: 'PCM', subjects: ['phy', 'che', 'mat'] },
  { label: 'PCB', subjects: ['phy', 'che', 'bio'] },
  { label: 'PCMB', subjects: ['phy', 'che', 'mat', 'bio'] },
];
