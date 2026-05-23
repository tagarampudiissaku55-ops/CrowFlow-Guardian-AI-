# CrowdFlow Guardian AI - Security Specifications & Threat Vector Analysis

This document traces the data invariants for stadium crowd control operations, details the security boundaries required, and showcases the defensive payloads designed to enforce safety constraints.

## 1. Data Invariants by Collection

### A. Incidents (`/incidents/{incidentId}`)
- **Owner Consistency**: The field `authorId` must strictly equal the calling client's `request.auth.uid`.
- **Temporal Locking**: The `createdAt` timestamp must match the exact transaction slot `request.time`. It is immutable after creation.
- **Form Constraint**: `id` must be a high-entropy string conforming to `isValidId()`, and must match the database document ID.
- **Content Limits**: All descriptions must be strings of size bounded by 300 characters to block Buffer Overflow or resource exhaustion.
- **Enum Rigor**: Field `severity` must fall inside are precise bounds: `['Low', 'Medium', 'High']`.

### B. Safety Reports (`/safetyReports/{reportId}`)
- **Read Isolation**: Any auditor can read certified safety summaries.
- **Write Prevention**: Certified Safety reports cannot be mutated in any form. Only creation is allowed by authenticated supervisors.
- **Creator Check**: `creatorId` must be matching the signing supervisor's `request.auth.uid`.
- **System Hardening**: `riskLevel` must match the enum: `['SAFE', 'MODERATE', 'HIGH', 'CRITICAL']`.

### C. Simulation Presets (`/savedPresets/{presetId}`)
- **Identity Lock**: `creatorId` must equal `request.auth.uid`. No user can save presets under someone else's identity.
- **Structure**: All arrays containing gates or zone densities must be size-constrained (`gates.size() <= 8` and `zones.size() <= 6`).

---

## 2. The "Dirty Dozen" Hostile Attack Payloads

Below are the 12 malicious payloads meant to expose system vulnerabilities, which will be forcefully rejected by our Zero-Trust Security Rules.

### Attack Vector 1: Identity Spoofing (Attempting to impersonate other officers)
- **Payload 1 (Incident Create)**:
  `{ "id": "inc-100", "authorId": "VictimUID_999", "type": "Panic Wave", "severity": "High", "zone": "Gate 5", "description": "Spoofed incident", "createdAt": "SERVER_TIMESTAMP" }`
  - *Expectation*: **PERMISSION_DENIED** (UID mismatch: `authorId` must be matching `request.auth.uid`).

### Attack Vector 2: Privilege Escalation (Setting admin/moderator custom fields)
- **Payload 2 (Incident Create)**:
  `{ "id": "inc-101", "authorId": "AttackerUID_123", "type": "Crowd Clash", "severity": "High", "zone": "Zone A", "description": "Normal clash", "createdAt": "SERVER_TIMESTAMP", "securityAccessRole": "SystemAdmin" }`
  - *Expectation*: **PERMISSION_DENIED** (Validation forbids shadow fields not defined by properties schema).

### Attack Vector 3: Integrity Poisoning (Injecting bulk characters for Denial-of-Wallet)
- **Payload 3 (Incident Create)**:
  `{ "id": "inc-102", "authorId": "AttackerUID_123", "type": "Panic Wave", "severity": "High", "zone": "Gate 1", "description": "LARGE_REPEATING_1_MEGABYTE_STRING...", "createdAt": "SERVER_TIMESTAMP" }`
  - *Expectation*: **PERMISSION_DENIED** (Description exceeds `size() <= 300` boundary limit).

### Attack Vector 4: Temporal Spoofing (Providing past/future timestamps)
- **Payload 4 (Incident Create)**:
  `{ "id": "inc-103", "authorId": "AttackerUID_123", "type": "Medical Emergency", "severity": "Medium", "zone": "Zone B", "description": "Faked timestamp", "createdAt": "2019-01-01T00:00:00Z" }`
  - *Expectation*: **PERMISSION_DENIED** (Requires `incoming().createdAt == request.time`).

### Attack Vector 5: Enum Boundary Tampering (Injecting arbitrary severities)
- **Payload 5 (Incident Create)**:
  `{ "id": "inc-104", "authorId": "AttackerUID_123", "type": "Crowd Clash", "severity": "CRITICAL_DOOMSDAY_LEVEL", "zone": "Zone C", "description": "Bypassing severity list", "createdAt": "SERVER_TIMESTAMP" }`
  - *Expectation*: **PERMISSION_DENIED** (Severity must reside within `Low/Medium/High`).

### Attack Vector 6: Document ID Mismatch (Poisoning other paths)
- **Payload 6 (Incident Create for /incidents/Incident_Alpha)**:
  `{ "id": "Incident_Omega_Sneaker", "authorId": "AttackerUID_123", "type": "Panic Wave", "severity": "Low", "zone": "Gate 4", "description": "Document mismatch", "createdAt": "SERVER_TIMESTAMP" }`
  - *Expectation*: **PERMISSION_DENIED** (Document path ID must translate exactly to payload property `id`).

### Attack Vector 7: Unauthenticated Read Spraying (Collecting telemetry signatures)
- **Payload 7 (Unauthenticated Get /incidents/inc-unknown)**:
  `No authorization header / token sent.`
  - *Expectation*: **PERMISSION_DENIED** (No active session discovered).

### Attack Vector 8: Orphaned Reference Injection (Referencing fictional entities)
- **Payload 8 (Preset Create)**:
  `{ "id": "preset-100", "name": "Fake", "description": "Faking referents", "weather": "Sunny", "matchPhase": "Unknown", "creatorId": "AttackerUID_123", "createdAt": "SERVER_TIMESTAMP", "gates": ["Gate-99-Fictional"] }`
  - *Expectation*: **PERMISSION_DENIED** (MatchPhase enum check fails).

### Attack Vector 9: Status Mutation Gap (Modifying historic safety scores)
- **Payload 9 (Safety Report Update /safetyReports/rep-100)**:
  `{ "riskLevel": "SAFE", "predictedOutcome": "Manipulated outcome by hacker" }`
  - *Expectation*: **PERMISSION_DENIED** (All updates on safety reports are blocked. They are terminal audit certificates).

### Attack Vector 10: Array Poisoning & Excessive Sizes
- **Payload 10 (Preset Create)**:
  `{ "id": "preset-101", "name": "Overflow", "description": "Crash", "weather": "Sunny", "matchPhase": "Post-Match (Egress)", "creatorId": "AttackerUID_123", "createdAt": "SERVER_TIMESTAMP", "gates": [ ...50 gate items... ] }`
  - *Expectation*: **PERMISSION_DENIED** (Gates list size throttled).

### Attack Vector 11: Document ID Junk characters
- **Payload 11 (Writing to /incidents/$$$MALICIOUS___ID$$$)**:
  - *Expectation*: **PERMISSION_DENIED** (ID does not match alpha-numeric regex filter).

### Attack Vector 12: Email Verification Spoofing (Email matched but unverified)
- **Payload 12 (Write from user with auth.token.email_verified == false)**:
  - *Expectation*: **PERMISSION_DENIED** (Only validated emails allowed to perform emergency writes).
