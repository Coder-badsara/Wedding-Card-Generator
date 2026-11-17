# Wedding Card Personalized Bulk PDF Generator (MVP V2.3)

A full-stack application to upload wedding invitation card PDFs, visually select and style the guest-name section on Page 1, and batch-generate serial-numbered personalized PDFs for multiple guests.

---

## 1. Project Structure

```
Invitation_Card_Name/
├── backend/                  # Django 5 + Django REST Framework + PyMuPDF
│   ├── core/                 # Django project settings, URLs, WSGI
│   ├── cards/                # Main cards application
│   │   ├── models.py         # CardProject, GenerationBatch, GeneratedCard
│   │   ├── serializers.py    # DRF Serializers with validation
│   │   ├── views.py          # Viewsets (Projects, Batches, Fonts, Preview)
│   │   ├── urls.py           # API routes
│   │   ├── services/
│   │   │   ├── pdf_engine.py       # PyMuPDF insert_htmlbox & auto-scaling
│   │   │   ├── preview_service.py  # 150 DPI Page 0 upright rasterizer
│   │   │   ├── coordinate_mapper.py# Derotation matrix & offset math
│   │   │   ├── font_manager.py     # Font catalog & Archive loader
│   │   │   ├── filename_sanitizer.py# Safe 3-digit serial naming
│   │   │   ├── batch_allocator.py  # Atomic batch allocation with SQLite retry
│   │   │   ├── batch_dispatcher.py # Subprocess dispatcher
│   │   │   └── recovery_service.py # Stale heartbeat / dead worker recovery
│   │   └── management/commands/
│   │       └── process_batch.py    # Dedicated worker process command
│   ├── fonts/                # Embedded TTF fonts (Noto Sans Devanagari, Great Vibes, Cinzel, Playfair)
│   ├── media/                # UUID-partitioned storage for originals, cards, and ZIPs
│   ├── requirements.txt
│   └── manage.py
├── frontend/                 # React 18 + Vite + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── api/              # Axios API client (Projects, Batches, Fonts)
│   │   ├── components/
│   │   │   ├── common/       # Navbar, Modals
│   │   │   ├── dashboard/    # ProjectCard, CreateProjectModal
│   │   │   ├── studio/       # VisualCardCanvas (Draggable box), TypographyToolbar, GuestInputPanel
│   │   │   └── batches/      # BatchProgressModal, BatchHistoryList
│   │   ├── pages/            # ProjectsDashboard, CardStudioPage
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── Megha_Virendra Singh.pdf  # Master wedding invitation card
├── run_backend.bat           # 1-Click backend launcher (Port 8000)
└── run_frontend.bat          # 1-Click frontend launcher (Port 5173)
```

---

## 2. Quick Start / How to Run

### Step 1: Start Backend
In a terminal (or double-click `run_backend.bat`):
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```
Backend API will be running at `http://localhost:8000`.

### Step 2: Start Frontend
In another terminal (or double-click `run_frontend.bat`):
```bash
cd frontend
npm run dev
```
Frontend will be running at `http://localhost:5173`. Open in your browser!

---

## 3. Verified Features

1. **Visual Card Studio Canvas**:
   - Page 0 preview renders clearly at 150 DPI.
   - Draggable & resizable bounding box with 6 handles to target the guest name section (e.g. next to *"श्रीमान्"*).
   - Real-time sample text preview inside the box.
   - Authoritative PyMuPDF preview button rendering exact vector text directly from the backend.
2. **Typography & Script Shaping**:
   - Bundled **Noto Sans Devanagari** with HarfBuzz complex OpenType shaping. Correctly renders conjuncts (`श्री`, `ष्ण`, `त्र`) and matras.
   - English luxury wedding fonts: **Great Vibes** (Calligraphy), **Cinzel** (Royal Serif), **Playfair Display**.
   - Auto-scaling font size fallback to prevent text clipping.
3. **Batch Generation**:
   - Textarea input (one guest name per line).
   - Generates serial-numbered PDFs (`001_Rajesh_Sharma.pdf`, `002_Amit_Sharma.pdf`, etc.).
   - Bundles all cards into an all-in-one downloadable ZIP archive.
   - Multiple batches on the same project are isolated and never overwrite previous batches.
4. **Resilient Background Worker**:
   - Python subprocess worker (`manage.py process_batch`) with zero Celery/Redis dependencies.
   - Heartbeat tracking and automatic dead worker detection.
   - Retry-from-scratch capability for failed runs.

---

## 4. Running Automated Tests

Run Django unit tests:
```bash
cd backend
python manage.py test cards
```

Run full end-to-end integration workflow on `Megha_Virendra Singh.pdf`:
```bash
cd backend
python test_full_workflow.py
```
