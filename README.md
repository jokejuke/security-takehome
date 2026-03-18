# Take-Home: Secure Bio Page API

## Assignment Prompt

In this exercise, you’ll be working with a simple API that manages LinkedIn-style bio pages.
The API includes basic functionality for creating, reading, and updating bio pages, but does not include authentication or authorization.

Your task is to design and implement a secure authentication and access control system around this API.

### Starter API capabilities
- Create bio pages
- View bio pages
- Update bio pages

### Candidate objective
Extend the system to support:
1. Authentication
- Users can sign up and log in
- Any auth approach is acceptable (sessions, JWTs, etc.)
- Only authenticated users can access protected functionality

2. User-scoped bio pages
- Each user automatically has a bio page
- A user can view and edit their own bio page

3. Sharing between users
- Users can share their bio page with other users, this allows them to edit the page
- The public can view any bio page
- Shared users can access only explicitly granted data

4. Authorization and access control
- Prevent unauthorized access/modification of bio pages
- Enforce permissions at API level

### Expectations
- Working authentication flow
- Clear access control enforcement
- Reasonable handling of edge cases
- Clean, understandable code

### Time expectation
- Please spend **2-4 hours maximum** on this assignment
- Prioritize the highest-impact security and access control work if time runs out
- Include your assumptions and future planned work in your documentation

### Required deliverables from candidate
1. Source code updates implementing authentication + authorization
2. Short design write-up explaining:
- Authentication approach
- Authorization and sharing model
- Tradeoffs and assumptions
- Security concerns and mitigations

### Follow-up interview
Be prepared to:
- Defend your project and key design choices
- Walk us through your decision-making process
- Explain tradeoffs, assumptions, and what you would improve with more time

## Project Structure

- `backend-ts/` NestJS API using `pg-mem` (in-memory SQL, no external DB service)
- `backend-csharp/` ASP.NET Core API (SQLite in-memory, no external DB service)
- `frontend/` Vite + React app

## Local Run Instructions

### Prerequisites
- Node.js 20+
- npm 10+
- .NET 10 SDK (only for `backend-csharp`)

### Run backend

Option A: TypeScript/NestJS backend

```bash
cd backend-ts
npm install
npm run dev
```

API will start at `http://localhost:3000`.

Option B: C#/.NET backend

```bash
cd backend-csharp
dotnet run
```

API will start at `http://localhost:3000`.

### Run frontend
In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

UI will start at `http://localhost:5173`.
Frontend routes:
- `/` dashboard and editor
- `/bio/:handle` public bio-page view by handle

If needed, set API URL in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

## API Endpoints

- `GET /bio-pages` - list all bio pages
- `GET /bio-pages/:id` - get a single bio page
- `GET /bio-pages/handle/:handle` - get a bio page by handle
- `POST /bio-pages` - create a bio page
- `PATCH /bio-pages/:id` - update a bio page

Both backends (`backend-ts` and `backend-csharp`) expose this same API contract.

Example `POST /bio-pages` payload:

```json
{
  "handle": "jane",
  "displayName": "Jane Doe",
  "bio": "Security engineer",
  "links": [
    { "label": "LinkedIn", "url": "https://linkedin.com/in/jane" }
  ]
}
```
