# PRAVAHA Product Architecture & System Specification

## System Overview
**PRAVAHA** (*"Predict. Navigate. Deliver."*) is an AI-based Smart Logistics and Accessibility Intelligence Platform built for the North Eastern Region (NER) of India (Problem Statement ID: 26002).

The platform is designed as a multi-application ecosystem to handle extreme weather, terrain instability, and frequent communication blackouts.

```
                    PRAVAHA ECOSYSTEM
                    
        ┌─────────────────────────────┐
        │      COMMAND CENTER         │
        │      (React/TS/Google Maps) │
        └─────────────┬───────────────┘
                      │
                PRAVAHA Core API (FastAPI)
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    RISK ENGINE   ROUTEGUARD   EARTH INTELLIGENCE
        │             │             │
        └─────────────┼─────────────┘
                      │
                FIELDLINK APP (Flutter Android)
                      │
              ┌───────┴────────┐
              │                │
           INTERNET          BLE MESH (Native Kotlin)
              │                │
              │          ┌─────┴─────┐
              │          │           │
              │        PHONE B     PHONE C
              │          │           │
              └──────────┴───────────┘
                         │
                    SERVER SYNC
```

## Core Subsystems

### 1. PRAVAHA Command Center (`src/`)
- Desktop & web-oriented GIS control room application built with React, TypeScript, and Google Maps API.
- Live vehicle telemetry tracking, road accessibility monitoring, satellite change detection comparison, and RouteGuard re-routing dashboard.

### 2. PRAVAHA FieldLink App (`apps/fieldlink`)
- Flutter Android mobile application tailored for Field Officers, Drivers, and Responders.
- Enables rapid incident reporting in under 20 seconds with automatic GPS, photos, and severity classification.
- Operates offline-first with persistent SQLite local database storage.

### 3. Shared FastAPI Backend (`services/api`)
- Python FastAPI REST & WebSocket API layer.
- PostgreSQL + PostGIS database schema storing entities: Users, Roads, Vehicles, Warehouses, Shipments, Incidents, FieldReports, Alerts, SatelliteObservations, MeshMessages, SyncEvents.

### 4. PRAVAHA Intelligence Layer (`services/ml`)
- Disruption Risk Engine calculating hazard scores using rainfall, terrain slope, satellite surface change, and GPS anomalies.
- Earth Intelligence module processing Sentinel-1/2 SAR/Optical imagery for flood and landslide change detection.

### 5. Resilient Mesh Communication Layer
- Native Android Kotlin BLE bridge (`PravahaBleBridge.kt`) and Web Bluetooth/WebRTC drivers (`RealWebBluetoothDriver.ts`).
- Multi-hop store-and-forward routing with TTL/hop limit validation, HMAC integrity verification, de-duplication cache, and gateway server sync.
