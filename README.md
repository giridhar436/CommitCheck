# CommitCheck

> AI-powered project governance and commitment tracking for software teams.

CommitCheck helps teams turn meetings, scope changes, and project commitments into a structured, auditable workflow. It combines AI-assisted meeting analysis with deterministic business rules so teams can quickly identify commitments, evidence, risks, authorization issues, change requests, and items requiring attention.

---

## ✨ Features

- 📁 **Project Management**
  - Create and manage projects
  - Project-level data isolation
  - Centralized project overview

- 🎯 **Scope Requirements**
  - Track project scope requirements
  - Monitor scope coverage and status
  - Maintain project-level ownership

- 📝 **Meeting Management**
  - Create and manage project meetings
  - Track meeting attachments
  - Analyze meeting content
  - Track analysis lifecycle and status

- 🤖 **AI Meeting Analysis**
  - Extract commitments from meeting content
  - Identify commitment owners
  - Detect risks and authorization status
  - Generate evidence associated with commitments
  - Atomic persistence of AI analysis results
  - Development provider for deterministic testing
  - Fireworks AI provider for production-oriented analysis

- 🤝 **Commitment Tracking**
  - Track who committed to what
  - Commitment risk levels
  - Authorization status
  - Verification status
  - Evidence tracking
  - Commitment lifecycle and audit activity

- 📎 **Commitment Evidence**
  - Attach evidence to commitments
  - Track evidence source and timestamps
  - Immutable evidence records

- 🔄 **Change Requests**
  - Track requested project changes
  - Authorization workflow
  - Clarification handling
  - Change request status tracking

- 📊 **Dashboard**
  - Project KPIs
  - Commitment breakdowns
  - Change request breakdowns
  - Recent activity
  - Items requiring attention
  - Risk visibility

- 🚨 **Alerts**
  - High-risk unauthorized commitments
  - Pending authorization
  - Pending change requests
  - Clarification-requested changes

- 📜 **Audit Activity**
  - Track important project events
  - Filter activity by action
  - Paginated activity history
  - Project-level audit trail

---

## 🏗️ Architecture

CommitCheck follows a layered full-stack architecture.

```text
┌──────────────────────────────┐
│          React UI            │
│       Vite Frontend          │
└──────────────┬───────────────┘
               │ HTTP / REST
               ▼
┌──────────────────────────────┐
│        NestJS API            │
│                              │
│ Controllers → Services       │
│ DTOs → Validation             │
│ Business Rules               │
│ AI Provider Abstraction      │
└──────────────┬───────────────┘
               │ Prisma ORM
               ▼
┌──────────────────────────────┐
│       PostgreSQL             │
│          Supabase            │
└──────────────────────────────┘
```

### AI Architecture

The AI layer uses a provider abstraction so the application is not tightly coupled to a single AI vendor.

```text
Meeting
   │
   ▼
Meeting Analysis Service
   │
   ├── Development Provider
   │
   └── Fireworks AI Provider
           │
           ▼
      Validated Result
           │
           ▼
      Atomic Database
        Transaction
```

AI output is treated as **untrusted input** and validated before it can affect project data.

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Modern responsive UI
- API service/adaptor layer

### Backend

- NestJS
- TypeScript
- Prisma ORM
- class-validator
- REST APIs

### Database

- PostgreSQL
- Supabase
- Prisma migrations

### AI

- Fireworks AI
- Provider abstraction
- Deterministic development provider

### Development

- Node.js
- npm
- Git
- GitHub
- Zed Code IDE

---

## 📂 Project Structure

```text
CommitCheck/
│
├── src/
│   ├── pages/
│   ├── components/
│   ├── services/
│   └── ...
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed/
│   │
│   ├── src/
│   │   ├── projects/
│   │   ├── scope-requirements/
│   │   ├── meetings/
│   │   ├── commitments/
│   │   ├── commitment-evidence/
│   │   ├── change-requests/
│   │   ├── dashboard/
│   │   ├── meeting-analysis/
│   │   └── ...
│   │
│   └── scripts/
│
├── package.json
└── README.md
```

---

## 🔐 Core Design Principles

### Project Isolation

Every nested resource is validated against its parent project.

For example:

```text
Project
  └── Meeting
       └── Commitment
            └── Evidence
```

Requests cannot access resources belonging to another project.

### Strict Validation

The backend uses DTO validation and rejects unexpected fields.

```text
ValidationPipe
├── whitelist
├── forbidNonWhitelisted
└── strict DTO validation
```

### Atomic Writes

Operations that create multiple related records use database transactions.

This prevents partially persisted AI analysis or business operations.

### AI Cannot Authorize Work

AI may identify commitments, risks, or possible evidence, but it does not independently authorize project work.

Authorization remains a deterministic business decision.

### Auditable Operations

Important project changes generate activity records so the system maintains an audit trail.

---

## 🤖 AI Meeting Analysis

CommitCheck supports multiple analysis providers.

### Development Provider

The development provider is deterministic and intended for:

- Local development
- Testing
- CI
- Predictable demonstrations

### Fireworks AI Provider

The Fireworks provider allows real AI-powered meeting analysis.

Configure:

```env
MEETING_ANALYSIS_PROVIDER=fireworks
FIREWORKS_API_KEY=your_api_key
FIREWORKS_MODEL=accounts/fireworks/models/kimi-k2-instruct
```

The provider validates the AI response before the application persists anything.

---

## 🔄 Meeting Analysis Lifecycle

```text
NOT_STARTED
     │
     ▼
 PROCESSING
     │
     ├──────────────► COMPLETED
     │
     └──────────────► FAILED
                           │
                           ▼
                        RETRY
```

The analysis service prevents duplicate concurrent processing and uses a transaction to persist the analysis results.

---

## 📡 API

The backend exposes REST APIs under:

```text
/api
```

Examples:

```http
GET /api/projects
```

```http
GET /api/projects/:projectId/dashboard
```

```http
GET /api/projects/:projectId/activity
```

```http
GET /api/projects/:projectId/alerts
```

```http
POST /api/projects/:projectId/meetings/:meetingId/analyze
```

Responses follow a consistent structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

---

## 💻 Local Development

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd CommitCheck
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure environment variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL="your_supabase_connection_string"
DIRECT_URL="your_supabase_direct_connection_string"

MEETING_ANALYSIS_PROVIDER=development

FIREWORKS_API_KEY=""
FIREWORKS_MODEL="accounts/fireworks/models/kimi-k2-instruct"
```

Do **not** commit `.env` files or API keys to GitHub.

---

## 🗄️ Database Setup

From the backend directory:

```bash
npx prisma migrate deploy
```

Generate Prisma Client:

```bash
npx prisma generate
```

If the project seed is configured:

```bash
npm run seed
```

Check migration status:

```bash
npx prisma migrate status
```

---

## ▶️ Running the Application

### Backend

From:

```text
backend/
```

run:

```bash
npm run start:dev
```

Backend:

```text
http://localhost:3000
```

### Frontend

From the project root:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🧪 Testing

CommitCheck includes automated API and regression testing across the major application phases.

Run backend tests according to the available project scripts.

Example:

```bash
npm test
```

Build the backend:

```bash
npm run build
```

Build the frontend:

```bash
npm run build
```

The project uses regression testing to ensure that new phases do not break previously implemented functionality.

---

## 📊 Dashboard Intelligence

The dashboard provides a consolidated view of project health.

It combines:

- Project information
- Commitment statistics
- Risk breakdowns
- Authorization status
- Change request status
- Recent activity
- Attention items
- Audit information

Dashboard and alert calculations are deterministic and do not require an AI call.

---

## 🚨 Alerts & Risk

CommitCheck identifies deterministic attention items such as:

### High-Risk Unauthorized Commitment

A commitment has a high risk level but has not been authorized.

### Pending Authorization

A commitment is awaiting an authorization decision.

### Pending Change Request

A change request has not yet been resolved.

### Clarification Requested

A change request requires additional clarification.

This makes the dashboard actionable instead of simply displaying raw project data.

---

## 🔒 Security & Data Integrity

CommitCheck is designed around several security and integrity principles:

- Project-level authorization checks
- Nested resource ownership validation
- Strict request validation
- No secret keys in source control
- AI output validation
- Transactional persistence
- Immutable evidence records
- Deterministic authorization rules
- Audit activity tracking

---

## 📈 Project Workflow

The intended workflow is:

```text
Create Project
      │
      ▼
Define Scope
      │
      ▼
Conduct Meeting
      │
      ▼
Attach Meeting Information
      │
      ▼
Run AI Analysis
      │
      ▼
Extract Commitments
      │
      ▼
Review Authorization & Risk
      │
      ▼
Collect Evidence
      │
      ▼
Track Change Requests
      │
      ▼
Monitor Dashboard & Alerts
      │
      ▼
Maintain Audit Trail
```

---

## 🎯 Why CommitCheck?

Traditional project management tools often record tasks and meetings separately.

CommitCheck focuses on the connection between them:

> **What was discussed → What was committed → Who committed → Was it authorized → What evidence exists → What needs attention?**

This creates a more accountable and auditable project workflow.

---

## 🧩 Development Philosophy

The project follows these principles:

- Keep controllers thin
- Put business logic inside services
- Validate all incoming data
- Enforce project isolation
- Prefer deterministic business rules
- Treat AI output as untrusted
- Use transactions for multi-record writes
- Keep frontend API communication behind service/adaptor layers
- Preserve backward compatibility through regression testing

---

## 🚀 Project Status

CommitCheck is under active development.

The implemented platform includes:

- Project management
- Scope requirements
- Meetings
- Meeting attachments
- AI meeting analysis
- Fireworks AI integration
- Commitments
- Commitment evidence
- Change requests
- Dashboard intelligence
- Alerts
- Audit activity
- Frontend/backend integration
- PostgreSQL/Supabase persistence
- Automated regression testing

---

## 🗺️ Roadmap

Potential future improvements include:

- Advanced AI analysis
- Additional AI providers
- Authentication and role-based access
- Real file storage
- Rich meeting document ingestion
- Advanced reporting
- Notifications
- Email integrations
- Calendar integrations
- Team collaboration
- Advanced analytics
- Production deployment improvements

---

## 🤝 Contributing

Contributions are welcome.

### Development workflow

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Implement the change
4. Add or update tests
5. Run regression tests
6. Build frontend and backend
7. Commit your changes

```bash
git commit -m "feat: add my feature"
```

8. Push the branch

```bash
git push origin feature/my-feature
```

9. Open a Pull Request

---

## 📜 License

Add the project's chosen license here.

For example:

```text
MIT License
```

---

## 👨‍💻 Author

**CommitCheck**

Built as a full-stack project focused on AI-assisted project governance, accountability, and auditability.
