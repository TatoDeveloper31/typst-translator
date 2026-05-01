# Typst Translator

A web app that converts plain text (with markdown-style formatting) into [Typst](https://typst.app/) markup.

**Stack:** React + Vite (frontend) · FastAPI + UV (backend)

## Getting started

### Backend

```bash
cd backend
uv run uvicorn main:app --reload
```

Runs on `http://localhost:8000`. API docs at `/docs`.

### Frontend

```bash
cd frontend
npm run dev
```

Runs on `http://localhost:5173`. Proxies `/api` requests to the backend automatically.

## What it converts

| Input | Typst output |
|---|---|
| `# Heading` | `= Heading` |
| `## Sub-heading` | `== Sub-heading` |
| `**bold**` | `*bold*` |
| `*italic*` | `_italic_` |
| `- list item` | `- list item` |
| `1. ordered` | `+ ordered` |

## Project structure

```
typst-translator/
├── frontend/          # React + Vite
│   └── src/
│       ├── components/
│       ├── utils/
│       └── ...
└── backend/           # FastAPI
    └── app/
        ├── routers/
        ├── services/
        └── models/
```
