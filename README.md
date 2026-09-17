# MPLADS Sentinel

### AI-Powered Risk Intelligence, Anomaly Detection & Verification Layer for MPLADS

MPLADS Sentinel is a prototype intelligence layer designed to work alongside the existing MPLADS digital ecosystem.

It analyses available MPLADS project information to identify unusual patterns, generate explainable review priorities, and support officials in deciding where closer verification may be required.

> **Sentinel does not replace eSAKSHI and does not make final administrative decisions. It provides AI-assisted risk intelligence and supports human review.**

---

## Overview

The implementation of a large public development programme generates a large volume of project, financial, lifecycle and expenditure information.

The challenge is not only storing and displaying this information, but identifying:

- Which works require closer attention?
- Which projects show unusual behaviour compared with similar works?
- Why has a particular work received a high review priority?
- What verification action should be considered?
- How can officials focus limited review resources on the most relevant cases?

MPLADS Sentinel addresses this challenge through a combination of:

**Risk Detection → Anomaly Analysis → Peer Benchmarking → Explainability → Prioritization → Human Verification**

---

## Key Features

### 1. Risk Intelligence Engine

The Risk Engine analyses project information using multiple complementary signals:

- Deterministic rule-based checks
- Isolation Forest anomaly detection
- Peer benchmarking
- Data-quality signals
- Lifecycle-aware analysis

The system produces:

- Risk score
- Risk band
- Risk signals
- Risk explanations

The system uses separate anomaly-detection models for different project lifecycle stages:

- Pre-sanction
- In-progress
- Post-completion

---

### 2. Explainable Decision Intelligence

Risk detection alone is not sufficient for an operational system.

MPLADS Sentinel converts risk signals into understandable decision-support information, including:

- Primary risk signal
- Explanation of the signal
- Why the signal matters
- Peer comparison where available
- Lifecycle comparison
- Available financial information
- Recommended verification action

The objective is to help an official understand **why a work has been prioritised**, rather than presenting an unexplained score.

---

### 3. Priority Review Queue

The system provides a prioritized operational queue of works requiring closer review.

Officials can use the queue to move from:

**National Portfolio → Priority Work → Project Intelligence → Verification**

The queue is intended to support human review rather than automatically declare fraud or wrongdoing.

---

### 4. National Risk Monitoring

The dashboard provides a national-level overview of the analysed project portfolio.

It includes:

- Total works
- Risk distribution
- State-level review priorities
- Geographic state-level visualization
- Priority works
- Financial summaries
- Operational review information

The prototype analyses a canonical dataset containing **72,675 works**.

---

### 5. State-Level Risk Intelligence

State monitoring provides a more focused view of project risk and review priorities.

The dashboard supports jurisdiction-aware views for relevant users and allows officials to move from national-level information to state-level analysis.

---

### 6. Project Intelligence

Each project can be examined through a dedicated intelligence view containing:

- Project information
- Risk score
- Risk band
- Risk explanation
- Risk signals
- Peer benchmarking
- Lifecycle comparison
- Expenditure information
- Data provenance
- Recommended verification action

---

### 7. Human-in-the-Loop Verification

MPLADS Sentinel is designed around human decision-making.

The system:

**Detects → Explains → Prioritizes → Recommends Verification**

The authorized official remains responsible for:

- Reviewing evidence
- Conducting verification
- Determining findings
- Taking administrative action

An anomaly is therefore treated as a **review signal**, not proof of fraud or corruption.

---

### 8. MP / Constituency Intelligence

The prototype also includes a constituency-level MP workflow.

The workflow is:

**Citizen Need → AI-Assisted Suggestion → MP Review → MP Recommendation → District Authority**

The AI assists with analysis and suggestions, while the MP retains the final recommendation decision.

---

## System Architecture

```text
                    MPLADS / Project Data
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Canonical Data    │
                 │ Recommendation      │
                 │ Sanction            │
                 │ Expenditure         │
                 │ Completion          │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    Risk Engine      │
                 │                     │
                 │ • Rules             │
                 │ • Isolation Forest  │
                 │ • Peer Benchmarking  │
                 │ • Data Quality      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Decision Intelligence│
                 │                     │
                 │ • Explanation       │
                 │ • Context           │
                 │ • Verification      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       FastAPI       │
                 │    REST API Layer   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    React Frontend   │
                 │                     │
                 │ • Dashboards        │
                 │ • Priority Queue    │
                 │ • Project Intel.    │
                 │ • State Monitoring  │
                 │ • MP Workspace      │
                 └──────────┬──────────┘
                            │
                            ▼
                       Human Review