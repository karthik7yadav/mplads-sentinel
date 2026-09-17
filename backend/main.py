import os
import urllib.parse
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Query, Path, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from data_loader import loader

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load authoritative datasets on startup
    if not loader.is_loaded:
        loader.load_all()
    yield

app = FastAPI(
    title='MPLADS SENTINEL - Authoritative Intelligence API',
    description='FastAPI backend exposing authoritative Stage 1.6, Stage 2.1.1, and Stage 2.2.1 MPLADS datasets.',
    version='1.0.0',
    lifespan=lifespan
)

# CORS configured strictly for Vite frontend development origin
origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['GET', 'OPTIONS'],
    allow_headers=['*'],
)

def clean_work_id(raw_id: str) -> str:
    unquoted = urllib.parse.unquote(raw_id).strip().strip('/')
    return unquoted

# -------------------------------------------------------------
# 1. Health Endpoint
# -------------------------------------------------------------
@app.get('/health', summary='Backend Health Check', tags=['System'])
def get_health():
    return {'status': 'ok'}

# -------------------------------------------------------------
# 2. Dashboard Summary Endpoint
# -------------------------------------------------------------
@app.get('/dashboard/summary', summary='National Dashboard Summary', tags=['Analytics'])
def get_dashboard_summary():
    return loader.get_dashboard_summary()

# -------------------------------------------------------------
# 3. Risk Summary Endpoint
# -------------------------------------------------------------
@app.get('/risk/summary', summary='Authoritative Risk Band Distribution', tags=['Risk Intelligence'])
def get_risk_summary():
    return loader.get_risk_summary()

# -------------------------------------------------------------
# 4. Priority Queue Endpoint
# -------------------------------------------------------------
@app.get('/risk/priority', summary='Operational Priority Queue', tags=['Risk Intelligence'])
def get_priority_queue(
    limit: int = Query(default=100, ge=1, le=500, description='Max items to return'),
    offset: int = Query(default=0, ge=0, description='Offset pagination')
):
    return loader.get_priority_queue(limit=limit, offset=offset)

# -------------------------------------------------------------
# 5. State Summary Endpoint
# -------------------------------------------------------------
@app.get('/state/summary', summary='State-level Aggregates', tags=['Analytics'])
def get_state_summary():
    states = loader.get_state_summary()
    return {
        'total_states': len(states),
        'reconciliation': {
            'total_works': sum(s['total_works'] for s in states),
            'critical_works': sum(s['critical_works'] for s in states),
            'high_risk_works': sum(s['high_risk_works'] for s in states),
            'total_project_outlay_crores': round(sum(s['project_outlay_crores_exact'] for s in states), 2),
            'total_pure_sanctioned_crores': round(sum(s['pure_sanctioned_crores_exact'] for s in states), 2),
            'total_expenditure_crores': round(sum(s['expenditure_crores_exact'] for s in states), 2)
        },
        'states': states
    }

# -------------------------------------------------------------
# 6. Works Directory Endpoint
# -------------------------------------------------------------
@app.get('/works', summary='Query Canonical Works Master', tags=['Works'])
def get_works(
    search: Optional[str] = Query(default=None, description='Search by ID, title, MP, or constituency'),
    state: Optional[str] = Query(default=None, description='Filter by state name'),
    risk_band: Optional[str] = Query(default=None, description='Filter by risk band (CRITICAL, HIGH, MEDIUM, LOW)'),
    lifecycle: Optional[str] = Query(default=None, description='Filter by lifecycle mode (PRE_SANCTION, IN_PROGRESS, POST_COMPLETION)'),
    scope: Optional[str] = Query(default='operational', description='Scope: operational (863 works) or all (72,675 works)'),
    limit: int = Query(default=1000, ge=1, le=2000, description='Page size limit'),
    offset: int = Query(default=0, ge=0, description='Offset pagination')
):
    return loader.get_works(
        search=search,
        state=state,
        risk_band=risk_band,
        lifecycle=lifecycle,
        scope=scope,
        limit=limit,
        offset=offset
    )

# -------------------------------------------------------------
# 7. Work-specific Risk Endpoint (Order before {work_id:path})
# -------------------------------------------------------------
@app.get('/works/{work_id:path}/risk', summary='Work Risk Engine Output', tags=['Works'])
def get_work_risk(work_id: str):
    wid = clean_work_id(work_id)
    try:
        return loader.get_risk(wid)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Work ID not found in authoritative dataset: {wid}'
        )

# -------------------------------------------------------------
# 8. Work-specific Signals Endpoint
# -------------------------------------------------------------
@app.get('/works/{work_id:path}/signals', summary='Work Risk Signals', tags=['Works'])
def get_work_signals(work_id: str):
    wid = clean_work_id(work_id)
    try:
        return loader.get_signals(wid)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Work ID not found in authoritative dataset: {wid}'
        )

# -------------------------------------------------------------
# 9. Work-specific Expenditure Endpoint
# -------------------------------------------------------------
@app.get('/works/{work_id:path}/expenditure', summary='Work Expenditure Events', tags=['Works'])
def get_work_expenditure(work_id: str):
    wid = clean_work_id(work_id)
    try:
        return loader.get_expenditure(wid)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Work ID not found in authoritative dataset: {wid}'
        )

# -------------------------------------------------------------
# 10. Single Work Canonical Detail (Includes Decision Intelligence)
# -------------------------------------------------------------
@app.get('/works/{work_id:path}', summary='Canonical Work Record & Intelligence', tags=['Works'])
def get_work_detail(work_id: str):
    wid = clean_work_id(work_id)
    try:
        return loader.get_work(wid)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Work ID not found in authoritative dataset: {wid}'
        )
