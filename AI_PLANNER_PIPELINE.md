# FTMM Compass AI — Study Planner Agent Pipeline Architecture

Dokumen ini mendefinisikan spesifikasi teknis, arsitektur pipeline, skema slot-filling, deterministic tools, dan integrasi UI untuk agen asisten akademik **FTMM Compass AI**.

---

## 1. Ringkasan & Prinsip Desain

Compass AI Study Planner adalah agen percakapan (*conversational agent*) yang bertugas menyusun rencana studi yang dipersonalisasi bagi mahasiswa FTMM (Fakultas Teknologi Maju dan Multidisiplin), Universitas Airlangga.

### Prinsip Utama (Zero-Assumption & Deterministic Guardrails)
1. **No-Assumption (Strict Clarification)**:
   - LLM dilarang membuat asumsi terkait prodi, semester saat ini, riwayat kelulusan, atau minat mahasiswa.
   - LLM harus mengumpulkan informasi secara interaktif menggunakan pola **Slot-Filling** sebelum diizinkan menyusun rencana studi.
2. **Deterministic Validation**:
   - LLM bertindak sebagai perencana (*planner*) dan antarmuka percakapan.
   - Validasi graf dependensi prasyarat (*prerequisite DAG*), paritas semester (Ganjil/Genap), dan batas maksimum SKS dihitung secara deterministik oleh program (Tools), bukan ditebak oleh LLM.
3. **Structured UI Integration**:
   - Output rencana studi dari AI dikonversi menjadi payload terstruktur (JSON) yang langsung dapat diterapkan ke antarmuka visual `DegreePlanner.tsx`.

---

## 2. Diagram Alur Pipeline Sistem

```
 Mahasiswa (Chatbot UI)
       │
       ▼ (1. Pesan Pengguna)
┌─────────────────────────────────────────────────────────────┐
│                   LangChain Agent Controller                │
│                                                             │
│  ┌───────────────────────┐      ┌────────────────────────┐  │
│  │   Slot-Filling State  │ <──> │  System Guardrails &   │  │
│  │   (Student Profile)   │      │  Anti-Assumption Rules │  │
│  └───────────────────────┘      └────────────────────────┘  │
│               │                              │              │
│               ▼                              ▼              │
│       [Slot Belum Lengkap]          [Slot Lengkap & Valid]  │
│               │                              │              │
│     Tanya Konfirmasi User                    ▼              │
│                                  ┌───────────────────────┐  │
│                                  │ Tool Execution Engine │  │
│                                  └───────────────────────┘  │
└──────────────────────────────────────────────┬──────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               │                                                               │
               ▼                                                               ▼
┌──────────────────────────────┐                              ┌──────────────────────────────┐
│  Course Catalog Database     │                              │   Prerequisite & Parity      │
│  (Data Kurikulum & Silabus)  │                              │      DAG Validator Tool      │
└──────────────────────────────┘                              └──────────────────────────────┘
               │                                                               │
               └───────────────────────────────┬───────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Rencana Studi Tervalidasi (Payload JSON) + Action Card Widget                                │
│ [ Terapkan Rencana Ini ke Degree Planner ]                                                   │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │ (User Klik Aksi)
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Frontend React State (App.tsx -> DegreePlanner.tsx: Roadmap Semester 1-8 Diperbarui)        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Skema Template Slot-Filling (Student Profile)

Sebelum memicu tools perencanaan, agen harus melengkapi slot data berikut melalui percakapan:

```json
{
  "program_studi": "Teknologi Sains Data",
  "semester_saat_ini": 3,
  "riwayat_matkul_lulus": [
    "Matematika I",
    "Fisika Dasar I",
    "Matematika II",
    "Dasar Pemrograman"
  ],
  "minat_fokus": [
    "Machine Learning",
    "Computer Vision"
  ],
  "target_kelulusan_semester": 7,
  "maks_sks_per_semester": 20,
  "is_confirmed_by_user": true
}
```

### Definisi Slot:
- **`program_studi`** *(Required)*: Nama prodi resmi FTMM (misal: Rekayasa Perangkat Lunak, Teknologi Sains Data, Teknik Robotika dan Kecerdasan Buatan, Teknik Elektro, Teknik Industri).
- **`semester_saat_ini`** *(Required)*: Integer (1-8).
- **`riwayat_matkul_lulus`** *(Required)*: Daftar mata kuliah yang sudah ditempuh dan lulus.
- **`minat_fokus`** *(Required)*: Bidang spesialisasi atau topik pilihan yang diinginkan mahasiswa.
- **`target_kelulusan_semester`** *(Optional, default: 8)*: Target semester kelulusan (7 atau 8).
- **`maks_sks_per_semester`** *(Optional, default: 24)*: Beban SKS maksimum yang diinginkan.
- **`is_confirmed_by_user`** *(Required)*: Boolean. Agen harus mengonfirmasi rangkuman sebelum membuat rencana final.

---

## 4. Spesifikasi Deterministic Tools

### Tool 1: `search_courses`
- **Fungsi**: Mencari dan memfilter daftar mata kuliah dari kurikulum resmi berdasarkan prodi, semester, jenis (Wajib/Pilihan), dan kata kunci/minat.
- **Input**:
  ```json
  {
    "program_studi": "Teknologi Sains Data",
    "semester": 5,
    "jenis": "Pilihan",
    "keywords": ["machine learning", "data"]
  }
  ```
- **Output**: Array objek mata kuliah yang valid dari kurikulum.

### Tool 2: `validate_plan_constraints`
- **Fungsi**: Memvalidasi seluruh urutan rancangan studi dari semester ke semester.
- **Aturan yang Diperiksa**:
  1. **Prerequisite DAG**: Mata kuliah B yang mensyaratkan A hanya boleh diambil jika A sudah ada di riwayat kelulusan atau dijadwalkan di semester `< semester(B)`.
  2. **Semester Parity**:
     - Mata kuliah paritas **Ganjil (`odd`)** hanya boleh dijadwalkan pada semester 1, 3, 5, 7.
     - Mata kuliah paritas **Genap (`even`)** hanya boleh dijadwalkan pada semester 2, 4, 6, 8.
  3. **Beban SKS**: Total SKS per semester tidak boleh melebihi `maks_sks_per_semester`.
  4. **Duplikasi**: Tidak boleh ada mata kuliah yang sama dijadwalkan lebih dari satu kali jika sudah lulus.
- **Output**:
  ```json
  {
    "is_valid": true,
    "errors": [],
    "total_sks_planned": 144
  }
  ```

### Tool 3: `generate_degree_plan_payload`
- **Fungsi**: Memformat rencana studi yang valid menjadi struktur state yang siap dikonsumsi langsung oleh `DegreePlanner.tsx`.
- **Output Format**:
  ```json
  {
    "action": "APPLY_DEGREE_PLAN",
    "summary": {
      "program_studi": "Teknologi Sains Data",
      "target_semester": 7,
      "total_credits": 144,
      "focus_tracks": ["Machine Learning", "Computer Vision"]
    },
    "plan": {
      "1": [...],
      "2": [...],
      "3": [...],
      "4": [...],
      "5": [...],
      "6": [...],
      "7": [...]
    }
  }
  ```

---

## 5. Spesifikasi API Backend (FastAPI)

- `GET /api/health` -> Health check & status koneksi LLM (Ollama).
- `GET /api/catalog/courses?prodi=...` -> Mengambil daftar mata kuliah per program studi.
- `POST /api/chat` -> Endpoint interaksi percakapan utama (mendukung streaming SSE / JSON response).
- `POST /api/plan/validate` -> Endpoint validasi rencana studi secara deterministik.

---

## 6. Kontrak Integrasi UI Frontend

1. **Komponen Chatbot (`src/pages/Chatbot.tsx`)**:
   - Menerima pesan teks biasa dan pesan tipe khusus `plan_recommendation`.
   - Menampilkan kartu rekomendasi interaktif saat AI mengembalikan payload rencana studi.
   - Tombol **[Terapkan Rencana Ini ke Degree Planner]** memicu callback `onApplyPlan(planPayload)`.
2. **State Global (`src/App.tsx`)**:
   - Menyimpan `customPlan` yang diterima dari Chatbot.
   - Mengarahkan navigasi ke tab `degree-planner`.
3. **Papan Visual (`src/pages/DegreePlanner.tsx`)**:
   - Memperbarui state `plan` dengan data dari AI dan menampilkan indikator visual bahwa rencana berasal dari rekomendasi Compass AI.

---

## 7. QA & Verification Matrix

- [x] Verifikasi LLM offline/online fallback.
- [x] Verifikasi penolakan asumsi (Agen menanyakan prodi dan semester jika tidak disebutkan).
- [x] Verifikasi penegakan graf prasyarat (Prerequisite DAG validation).
- [x] Verifikasi penegakan semester ganjil/genap (Parity constraint).
- [x] Verifikasi transfer payload ke state React UI tanpa runtime error.
