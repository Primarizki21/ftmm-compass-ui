export interface PrerequisiteNode {
  id: string
  name: string
  prereqs?: { id: string name: string }[]
}

export interface WorkloadInfo {
  hours: number
  lectureCredits: number
  labCredits: number
}

export interface Course {
  id: string
  /** Official course code (e.g. EF401); differs from id when ids are program-scoped. */
  code?: string
  /** Owning study program, set for courses loaded from the curriculum catalog. */
  program?: string
  name: string
  credits: number
  semester: number
  type: "Wajib" | "Pilihan"
  desc: string
  parity: "odd" | "even"
  prerequisites?: PrerequisiteNode[]
  workload?: WorkloadInfo
}

export const MOCK_COURSES: Course[] = [
  {
    id: "II4042",
    name: "Machine Learning",
    credits: 3,
    semester: 5,
    type: "Wajib",
    parity: "odd",
    desc: "Mempelajari konsep dasar pembelajaran mesin, algoritma supervised dan unsupervised learning, evaluasi model, serta implementasi praktis menggunakan Python dan scikit-learn.",
    prerequisites: [
      {
        id: "II2011",
        name: "Aljabar Linear",
        prereqs: [{ id: "MA1101", name: "Matematika I" }],
      },
      {
        id: "II2012",
        name: "Probabilitas & Statistik",
        prereqs: [{ id: "MA1101", name: "Matematika I" }],
      },
    ],
    workload: { hours: 150, lectureCredits: 3, labCredits: 0 },
  },
  {
    id: "II4045",
    name: "Data Visualization",
    credits: 3,
    semester: 5,
    type: "Pilihan",
    parity: "odd",
    desc: "Teknik visualisasi data untuk komunikasi informasi yang efektif menggunakan library modern seperti D3.js, matplotlib, Tableau, dan prinsip desain visual.",
    prerequisites: [
      {
        id: "II3011",
        name: "Database Systems",
        prereqs: [{ id: "IF1210", name: "Dasar Pemrograman" }],
      },
    ],
    workload: { hours: 150, lectureCredits: 2, labCredits: 1 },
  },
  {
    id: "II3011",
    name: "Database Systems",
    credits: 4,
    semester: 3,
    type: "Wajib",
    parity: "odd",
    desc: "Konsep basis data relasional, desain ERD, normalisasi, query SQL tingkat lanjut, optimasi, transaksi, concurrency control, dan pengantar NoSQL.",
    prerequisites: [{ id: "IF1210", name: "Dasar Pemrograman", prereqs: [] }],
    workload: { hours: 200, lectureCredits: 3, labCredits: 1 },
  },
  {
    id: "II4050",
    name: "Deep Learning",
    credits: 3,
    semester: 6,
    type: "Pilihan",
    parity: "even",
    desc: "Arsitektur neural network tingkat lanjut termasuk CNN, RNN, LSTM, Transformer, GANs, dan penerapannya pada computer vision serta natural language processing.",
    prerequisites: [
      {
        id: "II4042",
        name: "Machine Learning",
        prereqs: [
          { id: "II2011", name: "Aljabar Linear" },
          { id: "II2012", name: "Probabilitas & Statistik" },
        ],
      },
    ],
    workload: { hours: 150, lectureCredits: 2, labCredits: 1 },
  },
  {
    id: "II3060",
    name: "Rekayasa Perangkat Lunak",
    credits: 3,
    semester: 4,
    type: "Wajib",
    parity: "even",
    desc: "Metodologi pengembangan perangkat lunak: requirements engineering, desain sistem, UML, testing, agile development, dan manajemen proyek software.",
    prerequisites: [{ id: "IF1210", name: "Dasar Pemrograman", prereqs: [] }],
    workload: { hours: 150, lectureCredits: 3, labCredits: 0 },
  },
  {
    id: "II2011",
    name: "Aljabar Linear",
    credits: 3,
    semester: 2,
    type: "Wajib",
    parity: "even",
    desc: "Vektor, matriks, determinan, transformasi linear, nilai dan vektor eigen, ruang vektor, dan aplikasinya dalam komputasi modern.",
    prerequisites: [{ id: "MA1101", name: "Matematika I", prereqs: [] }],
    workload: { hours: 150, lectureCredits: 3, labCredits: 0 },
  },
]

export interface ScheduleItem {
  id: number
  course: string
  code: string
  day: string
  start: number
  duration: number
  color: string
  conflict?: boolean
  room: string
}

export const SCHEDULE: ScheduleItem[] = [
  {
    id: 1,
    course: "Machine Learning",
    code: "II4042",
    day: "Selasa",
    start: 10,
    duration: 2,
    color: "bg-teal/20 text-navy border-teal/50",
    room: "Lab Komputasi 1",
  },
  {
    id: 2,
    course: "Data Visualization",
    code: "II4045",
    day: "Selasa",
    start: 10,
    duration: 3,
    color: "bg-warning/20 text-navy border-warning/50",
    conflict: true,
    room: "Lab Komputasi 2",
  },
  {
    id: 3,
    course: "Kewarganegaraan",
    code: "KU2001",
    day: "Rabu",
    start: 7,
    duration: 2,
    color: "bg-navy/10 text-navy border-navy/30",
    room: "R. 201",
  },
  {
    id: 4,
    course: "Deep Learning",
    code: "II4050",
    day: "Kamis",
    start: 13,
    duration: 3,
    color: "bg-gold/20 text-navy border-gold/50",
    room: "Lab Komputasi 3",
  },
]
