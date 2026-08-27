from typing import List, Dict, Optional
from schemas import CourseModel

# Comprehensive FTMM curriculum catalog with official program courses and prerequisite chains
FTMM_CURRICULUM: Dict[str, List[CourseModel]] = {
    "Teknologi Sains Data": [
        # Semester 1 (Ganjil)
        CourseModel(
            id="TSD101", code="MA1101", name="Matematika I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Kalkulus diferensial dan integral fungsi satu variabel.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD102", code="FI1101", name="Fisika Dasar I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Mekanika klasik, termodinamika, dan gelombang.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD103", code="KU1001", name="Agama", credits=2, semester=1,
            type="Wajib", parity="odd", desc="Pendidikan karakter dan etika keagamaan.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD104", code="KU1002", name="Bahasa Indonesia", credits=2, semester=1,
            type="Wajib", parity="odd", desc="Tata tulis ilmiah dan komunikasi akademik.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD105", code="TSD1101", name="Pengantar Sains Data", credits=3, semester=1,
            type="Wajib", parity="odd", desc="Konsep dasar siklus hidup data dan analisis data.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD106", code="KU1003", name="Bahasa Inggris", credits=2, semester=1,
            type="Wajib", parity="odd", desc="Komunikasi teknis dan penulisan ilmiah bahasa Inggris.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        
        # Semester 2 (Genap)
        CourseModel(
            id="TSD201", code="MA1201", name="Matematika II", credits=4, semester=2,
            type="Wajib", parity="even", desc="Kalkulus multivariabel dan persamaan diferensial dasar.",
            program="Teknologi Sains Data", prerequisites=["Matematika I"]
        ),
        CourseModel(
            id="TSD202", code="IF1210", name="Dasar Pemrograman", credits=3, semester=2,
            type="Wajib", parity="even", desc="Logika algoritma, pemrograman terstruktur Python.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD203", code="II2011", name="Aljabar Linear", credits=3, semester=2,
            type="Wajib", parity="even", desc="Vektor, matriks, transformasi linear, nilai eigen.",
            program="Teknologi Sains Data", prerequisites=["Matematika I"]
        ),
        CourseModel(
            id="TSD204", code="KU2001", name="Kewarganegaraan", credits=2, semester=2,
            type="Wajib", parity="even", desc="Wawasan kebangsaan dan ketahanan nasional.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD205", code="KU2002", name="Pancasila", credits=2, semester=2,
            type="Wajib", parity="even", desc="Ideologi negara dan filsafat Pancasila.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD206", code="TSD1202", name="Etika dan Tata Kelola Data", credits=2, semester=2,
            type="Wajib", parity="even", desc="Prinsip privasi data, GDPR, PDP, dan etika kecerdasan buatan.",
            program="Teknologi Sains Data", prerequisites=[]
        ),

        # Semester 3 (Ganjil)
        CourseModel(
            id="TSD301", code="II2012", name="Probabilitas & Statistik", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Distribusi probabilitas, inferensi statistik, hipotesis.",
            program="Teknologi Sains Data", prerequisites=["Matematika I"]
        ),
        CourseModel(
            id="TSD302", code="TSD2101", name="Struktur Data & Algoritma", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Array, stack, queue, tree, graph, kompleksitas algoritma.",
            program="Teknologi Sains Data", prerequisites=["Dasar Pemrograman"]
        ),
        CourseModel(
            id="TSD303", code="II3011", name="Database Systems", credits=4, semester=3,
            type="Wajib", parity="odd", desc="Relational DB, SQL, ERD, normalisasi, indexing.",
            program="Teknologi Sains Data", prerequisites=["Dasar Pemrograman"]
        ),
        CourseModel(
            id="TSD304", code="TSD2102", name="Eksplorasi & Pembersihan Data", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Data wrangling, imputation, feature engineering.",
            program="Teknologi Sains Data", prerequisites=["Dasar Pemrograman"]
        ),
        CourseModel(
            id="TSD305", code="TSD2103", name="Analisis Regresi", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Regresi linear, logistik, GLM, diagnostik model.",
            program="Teknologi Sains Data", prerequisites=["Probabilitas & Statistik", "Aljabar Linear"]
        ),

        # Semester 4 (Genap)
        CourseModel(
            id="TSD401", code="TSD2201", name="Data Mining & Warehousing", credits=3, semester=4,
            type="Wajib", parity="even", desc="Association rule, clustering data warehouse, ETL OLAP.",
            program="Teknologi Sains Data", prerequisites=["Database Systems"]
        ),
        CourseModel(
            id="TSD402", code="TSD2202", name="Optimasi Matematika", credits=3, semester=4,
            type="Wajib", parity="even", desc="Linear programming, convex optimization, gradient descent.",
            program="Teknologi Sains Data", prerequisites=["Aljabar Linear", "Matematika II"]
        ),
        CourseModel(
            id="TSD403", code="TSD2203", name="Komputasi Awan untuk Data", credits=3, semester=4,
            type="Wajib", parity="even", desc="Infrastruktur cloud AWS/GCP, storage, distributed computing.",
            program="Teknologi Sains Data", prerequisites=["Database Systems"]
        ),
        CourseModel(
            id="TSD404", code="TSD2204", name="Riset Operasi Data", credits=3, semester=4,
            type="Wajib", parity="even", desc="Model stokastik, antrean, simulasi monte carlo.",
            program="Teknologi Sains Data", prerequisites=["Probabilitas & Statistik"]
        ),
        CourseModel(
            id="TSD405", code="TSD2205", name="Interaksi Manusia & Komputer", credits=3, semester=4,
            type="Wajib", parity="even", desc="Prinsip usability, prototyping antarmuka pengguna data.",
            program="Teknologi Sains Data", prerequisites=[]
        ),

        # Semester 5 (Ganjil)
        CourseModel(
            id="TSD501", code="II4042", name="Machine Learning", credits=3, semester=5,
            type="Wajib", parity="odd", desc="Supervised & unsupervised learning, ensemble, SVM, trees.",
            program="Teknologi Sains Data", prerequisites=["Aljabar Linear", "Probabilitas & Statistik"]
        ),
        CourseModel(
            id="TSD502", code="II4045", name="Data Visualization", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="Dashboard visual, storytelling dengan data, D3.js, Tableau.",
            program="Teknologi Sains Data", prerequisites=["Database Systems"]
        ),
        CourseModel(
            id="TSD503", code="TSD3101", name="Big Data Architecture", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="Hadoop, Spark, Kafka, streaming architecture.",
            program="Teknologi Sains Data", prerequisites=["Database Systems"]
        ),
        CourseModel(
            id="TSD504", code="TSD3102", name="Statistika Nonparametrik", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="Analisis data tanpa asumsi distribusi normal.",
            program="Teknologi Sains Data", prerequisites=["Probabilitas & Statistik"]
        ),
        CourseModel(
            id="TSD505", code="TSD3103", name="Time Series Forecasting", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="ARIMA, SARIMA, Prophet, RNN forecasting.",
            program="Teknologi Sains Data", prerequisites=["Probabilitas & Statistik"]
        ),

        # Semester 6 (Genap)
        CourseModel(
            id="TSD601", code="II4050", name="Deep Learning", credits=3, semester=6,
            type="Pilihan", parity="even", desc="CNN, RNN, Transformer, GAN, PyTorch framework.",
            program="Teknologi Sains Data", prerequisites=["Machine Learning"]
        ),
        CourseModel(
            id="TSD602", code="TSD3201", name="Natural Language Processing", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Text embeddings, LLM, BERT, tokenization, sentiment.",
            program="Teknologi Sains Data", prerequisites=["Machine Learning"]
        ),
        CourseModel(
            id="TSD603", code="TSD3202", name="Computer Vision", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Image processing, object detection YOLO, segmentation.",
            program="Teknologi Sains Data", prerequisites=["Machine Learning"]
        ),
        CourseModel(
            id="TSD604", code="TSD3203", name="Metodologi Penelitian & Penulisan Ilmiah", credits=2, semester=6,
            type="Wajib", parity="even", desc="Penyusunan proposal skripsi dan studi literatur.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD605", code="TSD3204", name="Business Intelligence & Analytics", credits=3, semester=6,
            type="Pilihan", parity="even", desc="KPI metrics, executive reporting, decision support system.",
            program="Teknologi Sains Data", prerequisites=["Database Systems"]
        ),

        # Semester 7 (Ganjil)
        CourseModel(
            id="TSD701", code="TSD4101", name="Kerja Praktik / Magang", credits=4, semester=7,
            type="Wajib", parity="odd", desc="Pengalaman kerja nyata di industri minimal 1 semester.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
        CourseModel(
            id="TSD702", code="TSD4102", name="MLOps & Model Deployment", credits=3, semester=7,
            type="Pilihan", parity="odd", desc="CI/CD machine learning, MLflow, Docker, FastAPI serving.",
            program="Teknologi Sains Data", prerequisites=["Machine Learning"]
        ),
        CourseModel(
            id="TSD703", code="TSD4103", name="Reinforcement Learning", credits=3, semester=7,
            type="Pilihan", parity="odd", desc="Q-Learning, Policy Gradient, MDP, Actor-Critic.",
            program="Teknologi Sains Data", prerequisites=["Deep Learning"]
        ),
        CourseModel(
            id="TSD704", code="TSD4104", name="Seminar Proposal Tugas Akhir", credits=2, semester=7,
            type="Wajib", parity="odd", desc="Sidang proposal skripsi/tugas akhir.",
            program="Teknologi Sains Data", prerequisites=["Metodologi Penelitian & Penulisan Ilmiah"]
        ),

        # Semester 8 (Genap)
        CourseModel(
            id="TSD801", code="TSD4201", name="Skripsi / Tugas Akhir", credits=6, semester=8,
            type="Wajib", parity="even", desc="Pengerjaan dan sidang skripsi sarjana sains data.",
            program="Teknologi Sains Data", prerequisites=["Seminar Proposal Tugas Akhir"]
        ),
        CourseModel(
            id="TSD802", code="TSD4202", name="KKN Tematik", credits=3, semester=8,
            type="Wajib", parity="even", desc="Kuliah Kerja Nyata pengabdian masyarakat.",
            program="Teknologi Sains Data", prerequisites=[]
        ),
    ],
    "Rekayasa Perangkat Lunak": [
        # Semester 1
        CourseModel(
            id="RPL101", code="MA1101", name="Matematika I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Kalkulus diferensial dan integral.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
        CourseModel(
            id="RPL102", code="FI1101", name="Fisika Dasar I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Fisika mekanika dan gelombang.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
        CourseModel(
            id="RPL103", code="IF1101", name="Pengantar Rekayasa Perangkat Lunak", credits=3, semester=1,
            type="Wajib", parity="odd", desc="Prinsip dasar rekayasa software dan SDLC.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
        CourseModel(
            id="RPL104", code="KU1001", name="Agama", credits=2, semester=1,
            type="Wajib", parity="odd", desc="Pendidikan agama.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
        # Semester 2
        CourseModel(
            id="RPL201", code="MA1201", name="Matematika II", credits=4, semester=2,
            type="Wajib", parity="even", desc="Kalkulus lanjut dan aljabar dasar.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Matematika I"]
        ),
        CourseModel(
            id="RPL202", code="IF1210", name="Dasar Pemrograman", credits=3, semester=2,
            type="Wajib", parity="even", desc="Algoritma dan pemrograman dasar.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
        CourseModel(
            id="RPL203", code="II2011", name="Aljabar Linear", credits=3, semester=2,
            type="Wajib", parity="even", desc="Vektor dan matriks.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Matematika I"]
        ),
        # Semester 3
        CourseModel(
            id="RPL301", code="IF2101", name="Struktur Data & Algoritma", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Struktur data dan algoritma.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Dasar Pemrograman"]
        ),
        CourseModel(
            id="RPL302", code="II3011", name="Database Systems", credits=4, semester=3,
            type="Wajib", parity="odd", desc="Sistem basis data dan SQL.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Dasar Pemrograman"]
        ),
        # Semester 4
        CourseModel(
            id="RPL401", code="II3060", name="Rekayasa Perangkat Lunak", credits=3, semester=4,
            type="Wajib", parity="even", desc="Analisis perancangan perangkat lunak, UML, Agile.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Dasar Pemrograman"]
        ),
        CourseModel(
            id="RPL402", code="IF2201", name="Pemrograman Web & Mobile", credits=4, semester=4,
            type="Wajib", parity="even", desc="Full-stack development, REST API, React, Flutter.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Database Systems"]
        ),
        # Semester 5
        CourseModel(
            id="RPL501", code="II4042", name="Machine Learning", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="Dasar pembelajaran mesin.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Aljabar Linear"]
        ),
        CourseModel(
            id="RPL502", code="IF3101", name="Cloud Computing & DevOps", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="Docker, Kubernetes, CI/CD pipeline.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Rekayasa Perangkat Lunak"]
        ),
        CourseModel(
            id="RPL503", code="IF3102", name="Software Architecture & Design Patterns", credits=3, semester=5,
            type="Wajib", parity="odd", desc="Microservices, Clean Architecture, Design Patterns.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Rekayasa Perangkat Lunak"]
        ),
        # Semester 6
        CourseModel(
            id="RPL601", code="II4050", name="Deep Learning", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Neural networks dan deep learning.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Machine Learning"]
        ),
        CourseModel(
            id="RPL602", code="IF3201", name="Software Quality Assurance & Testing", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Unit test, integration test, E2E testing, TDD.",
            program="Rekayasa Perangkat Lunak", prerequisites=["Rekayasa Perangkat Lunak"]
        ),
        # Semester 7 & 8
        CourseModel(
            id="RPL701", code="IF4101", name="Kerja Praktik / Magang", credits=4, semester=7,
            type="Wajib", parity="odd", desc="Magang industri.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
        CourseModel(
            id="RPL801", code="IF4201", name="Skripsi / Tugas Akhir", credits=6, semester=8,
            type="Wajib", parity="even", desc="Tugas akhir sarjana.",
            program="Rekayasa Perangkat Lunak", prerequisites=[]
        ),
    ],
}

# Alias mapping for user input normalization
PRODI_ALIASES = {
    "tsd": "Teknologi Sains Data",
    "sains data": "Teknologi Sains Data",
    "data science": "Teknologi Sains Data",
    "teknologi sains data": "Teknologi Sains Data",
    "rpl": "Rekayasa Perangkat Lunak",
    "rekayasa perangkat lunak": "Rekayasa Perangkat Lunak",
    "software engineering": "Rekayasa Perangkat Lunak",
    "trkb": "Teknik Robotika dan Kecerdasan Buatan",
    "robotika": "Teknik Robotika dan Kecerdasan Buatan",
    "te": "Teknik Elektro",
    "elektro": "Teknik Elektro",
    "ti": "Teknik Industri",
    "industri": "Teknik Industri",
}


def normalize_prodi(prodi_input: Optional[str]) -> Optional[str]:
    if not prodi_input:
        return None
    cleaned = prodi_input.strip().lower()
    for alias, formal_name in PRODI_ALIASES.items():
        if alias in cleaned:
            return formal_name
    return prodi_input.strip()


def get_courses_for_program(prodi: str) -> List[CourseModel]:
    norm = normalize_prodi(prodi) or "Teknologi Sains Data"
    if norm in FTMM_CURRICULUM:
        return FTMM_CURRICULUM[norm]
    # Default fallback to TSD if unknown
    return FTMM_CURRICULUM["Teknologi Sains Data"]
