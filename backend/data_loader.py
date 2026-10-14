import os
import glob
import json
import re
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
    "Teknik Robotika dan Kecerdasan Buatan": [
        CourseModel(
            id="TRKB101", code="MA1101", name="Matematika I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Kalkulus diferensial dan integral.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=[]
        ),
        CourseModel(
            id="TRKB102", code="FI1101", name="Fisika Dasar I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Mekanika klasik dan kinematika partikel.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=[]
        ),
        CourseModel(
            id="TRKB103", code="TRKB1101", name="Pengantar Robotika & AI", credits=3, semester=1,
            type="Wajib", parity="odd", desc="Sejarah, komponen sensor-aktuator, dan dasar otomasi cerdas.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=[]
        ),
        CourseModel(
            id="TRKB201", code="IF1210", name="Dasar Pemrograman", credits=3, semester=2,
            type="Wajib", parity="even", desc="Pemrograman C/C++ dan Python untuk sistem tertanam.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=[]
        ),
        CourseModel(
            id="TRKB202", code="II2011", name="Aljabar Linear", credits=3, semester=2,
            type="Wajib", parity="even", desc="Matriks transformasi homogen dan ruang vektor robotika.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=["Matematika I"]
        ),
        CourseModel(
            id="TRKB301", code="TRKB2101", name="Rangkaian Listrik & Elektronika", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Analisis rangkaian DC/AC, semikonduktor, dan penguat operasional.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=["Fisika Dasar I"]
        ),
        CourseModel(
            id="TRKB401", code="TRKB2201", name="Kinematika & Dinamika Robot", credits=3, semester=4,
            type="Wajib", parity="even", desc="Forward/inverse kinematics, Denavit-Hartenberg, dan dinamika manipulator.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=["Aljabar Linear"]
        ),
        CourseModel(
            id="TRKB501", code="TRKB3101", name="Sistem Kendali Cerdas", credits=3, semester=5,
            type="Wajib", parity="odd", desc="Kendali PID, ruang keadaan, fuzzy logic, dan kendali adaptif.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=["Kinematika & Dinamika Robot"]
        ),
        CourseModel(
            id="TRKB502", code="II4042", name="Machine Learning", credits=3, semester=5,
            type="Pilihan", parity="odd", desc="Pembelajaran mesin untuk persepsi dan pengambilan keputusan robot.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=["Aljabar Linear"]
        ),
        CourseModel(
            id="TRKB601", code="TRKB3201", name="Visi Komputer untuk Robotika", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Visual SLAM, deteksi objek real-time, dan kalibrasi kamera.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=["Machine Learning"]
        ),
        CourseModel(
            id="TRKB701", code="TRKB4101", name="Kerja Praktik / Magang", credits=4, semester=7,
            type="Wajib", parity="odd", desc="Magang industri robotika dan otomasi.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=[]
        ),
        CourseModel(
            id="TRKB801", code="TRKB4201", name="Skripsi / Tugas Akhir", credits=6, semester=8,
            type="Wajib", parity="even", desc="Tugas akhir sarjana teknik robotika dan kecerdasan buatan.",
            program="Teknik Robotika dan Kecerdasan Buatan", prerequisites=[]
        ),
    ],
    "Rekayasa Nanoteknologi": [
        CourseModel(
            id="RN101", code="MA1101", name="Matematika I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Kalkulus diferensial dan integral.",
            program="Rekayasa Nanoteknologi", prerequisites=[]
        ),
        CourseModel(
            id="RN102", code="FI1101", name="Fisika Dasar I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Fisika dasar mekanika dan termodinamika.",
            program="Rekayasa Nanoteknologi", prerequisites=[]
        ),
        CourseModel(
            id="RN103", code="KI1101", name="Kimia Dasar I", credits=3, semester=1,
            type="Wajib", parity="odd", desc="Struktur atom, ikatan kimia, dan stoikiometri.",
            program="Rekayasa Nanoteknologi", prerequisites=[]
        ),
        CourseModel(
            id="RN201", code="RN1201", name="Pengantar Nanoteknologi", credits=3, semester=2,
            type="Wajib", parity="even", desc="Prinsip skala nano, efek kuantum, dan klasifikasi nanomaterial.",
            program="Rekayasa Nanoteknologi", prerequisites=["Kimia Dasar I"]
        ),
        CourseModel(
            id="RN301", code="RN2101", name="Fisika Kuantum untuk Nanoteknologi", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Persamaan Schrodinger, sumur potensial kuantum, dan tunneling.",
            program="Rekayasa Nanoteknologi", prerequisites=["Fisika Dasar I", "Matematika I"]
        ),
        CourseModel(
            id="RN401", code="RN2201", name="Sintesis & Fabrikasi Nanomaterial", credits=3, semester=4,
            type="Wajib", parity="even", desc="Metode top-down dan bottom-up, sol-gel, CVD, dan litografi.",
            program="Rekayasa Nanoteknologi", prerequisites=["Pengantar Nanoteknologi"]
        ),
        CourseModel(
            id="RN501", code="RN3101", name="Karakterisasi Material Nano", credits=3, semester=5,
            type="Wajib", parity="odd", desc="Instrumentasi XRD, SEM, TEM, AFM, dan spektroskopi UV-Vis/FTIR.",
            program="Rekayasa Nanoteknologi", prerequisites=["Sintesis & Fabrikasi Nanomaterial"]
        ),
        CourseModel(
            id="RN601", code="RN3201", name="Nanobioteknologi & Sistem Penghantaran Obat", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Nanocarrier, biosensor, dan aplikasi biomedis nanomaterial.",
            program="Rekayasa Nanoteknologi", prerequisites=["Karakterisasi Material Nano"]
        ),
        CourseModel(
            id="RN701", code="RN4101", name="Kerja Praktik / Magang", credits=4, semester=7,
            type="Wajib", parity="odd", desc="Magang riset atau industri nanoteknologi.",
            program="Rekayasa Nanoteknologi", prerequisites=[]
        ),
        CourseModel(
            id="RN801", code="RN4201", name="Skripsi / Tugas Akhir", credits=6, semester=8,
            type="Wajib", parity="even", desc="Tugas akhir sarjana rekayasa nanoteknologi.",
            program="Rekayasa Nanoteknologi", prerequisites=[]
        ),
    ],
    "Teknik Industri": [
        CourseModel(
            id="TI101", code="MA1101", name="Matematika I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Kalkulus diferensial dan integral.",
            program="Teknik Industri", prerequisites=[]
        ),
        CourseModel(
            id="TI102", code="TI1101", name="Pengantar Teknik Industri", credits=3, semester=1,
            type="Wajib", parity="odd", desc="Sistem terintegrasi manusia, material, informasi, dan peralatan.",
            program="Teknik Industri", prerequisites=[]
        ),
        CourseModel(
            id="TI201", code="II2011", name="Aljabar Linear", credits=3, semester=2,
            type="Wajib", parity="even", desc="Matriks dan sistem persamaan linear untuk optimasi.",
            program="Teknik Industri", prerequisites=["Matematika I"]
        ),
        CourseModel(
            id="TI301", code="TI2101", name="Penelitian Operasional I", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Pemrograman linear, metode simpleks, dan analisis sensitivitas.",
            program="Teknik Industri", prerequisites=["Aljabar Linear"]
        ),
        CourseModel(
            id="TI401", code="TI2201", name="Ergonomi & Perancangan Sistem Kerja", credits=3, semester=4,
            type="Wajib", parity="even", desc="Antropometri, biomekanika, studi waktu dan gerakan.",
            program="Teknik Industri", prerequisites=["Pengantar Teknik Industri"]
        ),
        CourseModel(
            id="TI501", code="TI3101", name="Perencanaan & Pengendalian Produksi", credits=3, semester=5,
            type="Wajib", parity="odd", desc="Forecasting permintaan, MPS, MRP, dan penjadwalan lantai produksi.",
            program="Teknik Industri", prerequisites=["Penelitian Operasional I"]
        ),
        CourseModel(
            id="TI601", code="TI3201", name="Manajemen Rantai Pasok", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Desain jaringan logistik, koordinasi pasokan, dan distribusi.",
            program="Teknik Industri", prerequisites=["Perencanaan & Pengendalian Produksi"]
        ),
        CourseModel(
            id="TI701", code="TI4101", name="Kerja Praktik / Magang", credits=4, semester=7,
            type="Wajib", parity="odd", desc="Magang industri manufaktur atau jasa.",
            program="Teknik Industri", prerequisites=[]
        ),
        CourseModel(
            id="TI801", code="TI4201", name="Skripsi / Tugas Akhir", credits=6, semester=8,
            type="Wajib", parity="even", desc="Tugas akhir sarjana teknik industri.",
            program="Teknik Industri", prerequisites=[]
        ),
    ],
    "Teknik Elektro": [
        CourseModel(
            id="TE101", code="MA1101", name="Matematika I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Kalkulus diferensial dan integral.",
            program="Teknik Elektro", prerequisites=[]
        ),
        CourseModel(
            id="TE102", code="FI1101", name="Fisika Dasar I", credits=4, semester=1,
            type="Wajib", parity="odd", desc="Mekanika, gelombang, dan elektromagnetisme dasar.",
            program="Teknik Elektro", prerequisites=[]
        ),
        CourseModel(
            id="TE201", code="TE1201", name="Rangkaian Listrik I", credits=3, semester=2,
            type="Wajib", parity="even", desc="Hukum Kirchhoff, teorema jaringan, dan analisis transien.",
            program="Teknik Elektro", prerequisites=["Fisika Dasar I"]
        ),
        CourseModel(
            id="TE301", code="TE2101", name="Medan Elektromagnetik", credits=3, semester=3,
            type="Wajib", parity="odd", desc="Persamaan Maxwell, elektrostatika, dan magnetostatika.",
            program="Teknik Elektro", prerequisites=["Matematika I", "Fisika Dasar I"]
        ),
        CourseModel(
            id="TE401", code="TE2201", name="Sistem Tenaga Listrik", credits=3, semester=4,
            type="Wajib", parity="even", desc="Pembangkitan, transmisi, distribusi daya, dan aliran daya.",
            program="Teknik Elektro", prerequisites=["Rangkaian Listrik I"]
        ),
        CourseModel(
            id="TE501", code="TE3101", name="Sistem Kendali Dasar", credits=3, semester=5,
            type="Wajib", parity="odd", desc="Fungsi alih Laplace, kestabilan Routh-Hurwitz, dan Bode plot.",
            program="Teknik Elektro", prerequisites=["Rangkaian Listrik I"]
        ),
        CourseModel(
            id="TE601", code="TE3201", name="Energi Baru dan Terbarukan", credits=3, semester=6,
            type="Pilihan", parity="even", desc="Sistem fotovoltaik, turbin angin, smart grid, dan penyimpanan energi.",
            program="Teknik Elektro", prerequisites=["Sistem Tenaga Listrik"]
        ),
        CourseModel(
            id="TE701", code="TE4101", name="Kerja Praktik / Magang", credits=4, semester=7,
            type="Wajib", parity="odd", desc="Magang industri ketenagalistrikan atau telekomunikasi.",
            program="Teknik Elektro", prerequisites=[]
        ),
        CourseModel(
            id="TE801", code="TE4201", name="Skripsi / Tugas Akhir", credits=6, semester=8,
            type="Wajib", parity="even", desc="Tugas akhir sarjana teknik elektro.",
            program="Teknik Elektro", prerequisites=[]
        ),
    ],
}

# Alias mapping for user input normalization across all 5 FTMM programs
PRODI_ALIASES = {
    "teknologi sains data": "Teknologi Sains Data",
    "sains data": "Teknologi Sains Data",
    "data science": "Teknologi Sains Data",
    "tsd": "Teknologi Sains Data",
    "teknik robotika dan kecerdasan buatan": "Teknik Robotika dan Kecerdasan Buatan",
    "robotika dan kecerdasan buatan": "Teknik Robotika dan Kecerdasan Buatan",
    "robotika": "Teknik Robotika dan Kecerdasan Buatan",
    "trkb": "Teknik Robotika dan Kecerdasan Buatan",
    "s1 rekayasa nanoteknologi": "Rekayasa Nanoteknologi",
    "rekayasa nanoteknologi": "Rekayasa Nanoteknologi",
    "nanoteknologi": "Rekayasa Nanoteknologi",
    "nano": "Rekayasa Nanoteknologi",
    "rn": "Rekayasa Nanoteknologi",
    "teknik industri": "Teknik Industri",
    "industri": "Teknik Industri",
    "ti": "Teknik Industri",
    "teknik elektro": "Teknik Elektro",
    "elektro": "Teknik Elektro",
    "te": "Teknik Elektro",
}


def normalize_prodi(prodi_input: Optional[str]) -> Optional[str]:
    if not prodi_input:
        return None
    cleaned = prodi_input.strip().lower()
    if cleaned in PRODI_ALIASES:
        return PRODI_ALIASES[cleaned]
    for alias, formal_name in PRODI_ALIASES.items():
        if len(alias) > 3 and alias in cleaned:
            return formal_name
    return prodi_input.strip()


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return s or "course"


def _normalize_type(raw: Optional[str]) -> str:
    j = (raw or "").lower()
    if any(k in j for k in ["pilihan", "pengayaan", "peminatan"]):
        return "Pilihan"
    return "Wajib"


def _load_ekstrak_curriculum() -> Dict[str, List[CourseModel]]:
    curricula: Dict[str, List[CourseModel]] = {}
    current_dir = os.path.dirname(os.path.abspath(__file__))
    search_dirs = [
        os.path.join(os.path.dirname(current_dir), "Ekstrak"),
        os.path.join(current_dir, "Ekstrak"),
        os.path.join(current_dir, "..", "Ekstrak"),
    ]
    target_dir = None
    for d in search_dirs:
        if os.path.isdir(d):
            target_dir = d
            break

    if not target_dir:
        return curricula

    json_files = sorted(glob.glob(os.path.join(target_dir, "*.json")))
    for filepath in json_files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            meta = data.get("metadata", {})
            raw_prog = meta.get("program_studi") or os.path.basename(filepath).replace("FIX ", "").replace(".json", "")
            prog_name = normalize_prodi(re.sub(r"^S1\s+", "", raw_prog).strip())
            if not prog_name:
                continue

            mk_list = data.get("mata_kuliah", [])
            courses: List[CourseModel] = []
            used_ids = set()

            for i, m in enumerate(mk_list):
                code = m.get("kode_mk") or m.get("id")
                name = m.get("nama_mk") or f"Matkul {i+1}"
                sem = int(m.get("semester") or 1)
                cid = f"{_slugify(prog_name)}:{code or f'mk-{i+1}'}"
                if cid in used_ids:
                    cid += f"-{_slugify(name)}"
                while cid in used_ids:
                    cid += "-x"
                used_ids.add(cid)

                c_type = _normalize_type(m.get("jenis"))
                parity = "odd" if (sem % 2 == 1) else "even"

                raw_prereq = m.get("prasyarat") or []
                prereqs: List[str] = []
                if isinstance(raw_prereq, list):
                    for p in raw_prereq:
                        if isinstance(p, str) and p.strip():
                            prereqs.append(p.strip())
                        elif isinstance(p, dict) and p.get("nama_mk"):
                            prereqs.append(p["nama_mk"].strip())

                courses.append(
                    CourseModel(
                        id=cid,
                        code=code,
                        name=name,
                        credits=int(m.get("sks") or 3),
                        semester=sem,
                        type=c_type,
                        parity=parity,
                        desc=m.get("deskripsi") or "",
                        program=prog_name,
                        prerequisites=prereqs,
                    )
                )

            if courses:
                curricula[prog_name] = courses
        except Exception:
            continue

    return curricula


OFFICIAL_CURRICULUM = _load_ekstrak_curriculum()


def get_available_programs() -> List[str]:
    if OFFICIAL_CURRICULUM:
        return sorted(list(OFFICIAL_CURRICULUM.keys()))
    return list(FTMM_CURRICULUM.keys())


def get_courses_for_program(prodi: str) -> List[CourseModel]:
    norm = normalize_prodi(prodi)
    if norm and norm in OFFICIAL_CURRICULUM:
        return OFFICIAL_CURRICULUM[norm]
    if norm and norm in FTMM_CURRICULUM:
        return FTMM_CURRICULUM[norm]
    if "Teknologi Sains Data" in OFFICIAL_CURRICULUM:
        return OFFICIAL_CURRICULUM["Teknologi Sains Data"]
    return FTMM_CURRICULUM["Teknologi Sains Data"]


def get_all_courses() -> List[CourseModel]:
    active_curriculum = OFFICIAL_CURRICULUM if OFFICIAL_CURRICULUM else FTMM_CURRICULUM
    all_courses: List[CourseModel] = []
    for courses in active_curriculum.values():
        all_courses.extend(courses)
    return all_courses
