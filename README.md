# 📊 Analytics Dashboard

A production-ready full-stack Analytics Dashboard web application that processes data in any format and renders rich interactive dashboards with charts, KPIs, tables, and AI-generated insights.

## 🚀 Features

- **Upload any data format**: CSV, Excel, JSON, PDF, TXT, SQL, or even URLs
- **Automatic parsing & analysis**: Detects data types, generates KPIs and charts automatically
- **Rich visualizations**: Bar, Line, Pie, Area, Scatter, and Histogram charts with type-switching
- **AI-powered insights**: Anomaly detection, trend analysis, and recommendations (powered by Google Gemini)
- **Dark theme UI**: Modern glassmorphism design with TailwindCSS
- **Real-time processing**: Upload a file and see your dashboard instantly

## 🛠️ Tech Stack

### Backend
- **Python 3.12** with **FastAPI** & **Uvicorn**
- **Pandas** & **NumPy** for data processing
- **OpenPyXL** for Excel parsing
- **pdfplumber** for PDF extraction
- **Google Gemini API** for AI insights
- **python-multipart** & **aiofiles** for file handling

### Frontend
- **React 18** with **Vite**
- **TailwindCSS** for styling
- **Recharts** for charts
- **Lucide React** for icons
- **react-dropzone** for file uploads
- **react-hot-toast** for notifications
- **Axios** for API calls

## 📁 Project Structure

```
analytics-dashboard/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example         # Environment variables template
│   ├── routers/
│   │   ├── upload.py         # File upload endpoint
│   │   └── insights.py       # AI insights refresh endpoint
│   ├── services/
│   │   ├── file_parser.py    # Multi-format file parser
│   │   ├── data_processor.py # Data analysis & KPI/chart generation
│   │   └── ai_insights.py    # Gemini API integration
│   ├── models/
│   │   └── schemas.py        # Pydantic models
│   └── utils/
│       └── helpers.py        # Utility functions
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx    # Drag-and-drop upload
│   │   │   ├── Dashboard.jsx     # Main dashboard layout
│   │   │   ├── KPICards.jsx      # KPI metric cards
│   │   │   ├── ChartGrid.jsx     # Chart grid with type switching
│   │   │   ├── DataTable.jsx     # Searchable paginated table
│   │   │   ├── InsightsPanel.jsx # AI insights panel
│   │   │   └── Loader.jsx        # Processing loader
│   │   ├── api/
│   │   │   └── client.js         # Axios API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── sample_data/
│   ├── sales_data.csv        # 200 rows - sales analytics
│   ├── employee_data.xlsx    # 150 rows - HR analytics
│   └── web_traffic.json      # 100 rows - web analytics
├── start_backend.sh
├── start_frontend.sh
└── README.md
```

## 📦 Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment file and add your Gemini API key (optional - fallback insights work without it):

```bash
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY=your_key_here
```

### Frontend Setup

```bash
cd frontend
npm install
```

## 🏃 How to Run

### Start Backend (Terminal 1)

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --port 8000
```

Or using the startup script:

```bash
./start_backend.sh
```

The API will be available at `http://localhost:8000`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Or using the startup script:

```bash
./start_frontend.sh
```

The frontend will be available at `http://localhost:5173`

## 📤 Supported File Formats

| Format  | Extension  | Notes                                           |
|---------|------------|-------------------------------------------------|
| CSV     | .csv       | Auto-detects encoding (chardet)                 |
| Excel   | .xlsx, .xls| Reads first sheet automatically                 |
| JSON    | .json      | Handles nested JSON with flattening             |
| PDF     | .pdf       | Extracts tables; falls back to text extraction  |
| Text    | .txt       | Tries CSV/TSV parsing, then line-by-line        |
| SQL     | .sql       | Parses INSERT statements into rows              |

## 🔌 API Endpoints

| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | `/health`              | Health check                         |
| POST   | `/api/upload`          | Upload and analyze a file            |
| POST   | `/api/insights/refresh`| Regenerate AI insights               |

### POST /api/upload
Upload a file (multipart form data with field name `file`).

Response includes:
- `file_id`, `filename`, `row_count`, `column_count`
- `columns`, `column_types`, `preview`
- `kpis` - Top 4 key performance indicators
- `charts` - 4-6 chart configurations with data
- `table` - First 100 rows with total count
- `insights` - AI-generated analysis

### POST /api/insights/refresh
Send `{"column_stats": {...}}` with the column statistics to regenerate insights.

## 📊 Sample Data

The `sample_data/` directory contains three datasets:

1. **sales_data.csv** (200 rows) - Sales by region, product, and customer segment with date, amount, units, and profit
2. **employee_data.xlsx** (150 rows) - Employee demographics with salary, performance scores, and departments
3. **web_traffic.json** (100 rows) - Website analytics with sessions, bounce rates, and traffic sources

Upload these directly into the dashboard to test all features.

## 🤖 AI Insights

The dashboard uses Google's Gemini API to generate data-driven insights. To enable:

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add it to `backend/.env`: `GEMINI_API_KEY=your_key_here`
3. Restart the backend

Without an API key, the system generates statistical fallback insights automatically.

## 🎨 Design

- Dark theme with indigo/cyan brand palette
- Glassmorphism cards with gradient borders
- Responsive layout (mobile to desktop)
- Smooth animations and transitions
- Custom scrollbars

## 🖨️ Export

Click the "Export PDF" button in the dashboard header to print/save the dashboard as a PDF using your browser's print functionality.

## 📝 License

MIT