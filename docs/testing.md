# PRAVAHA System Testing & Validation Protocol

## 1. Web Command Center Validation
Run TypeScript compilation and Vite build checks:
```bash
npx tsc --noEmit
npm run build
```

## 2. Shared FastAPI Backend Validation
Run Python API test suite:
```bash
py services/ml/risk_model.py
```

## 3. Physical 3-Phone BLE Mesh Test Procedure
To validate multi-device store-and-forward functionality during hackathon judge demonstrations:

### Setup
- **Phone A**: Sender (Field Officer) - Disconnect Cellular & Wi-Fi
- **Phone B**: Relay (Vehicle / Patrol Node) - Disconnect Cellular & Wi-Fi
- **Phone C**: Gateway (Command Post / High-Ground Station) - Connected to Mobile Hotspot / Cellular Data

### Workflow Steps
1. On **Phone A**, open PRAVAHA FieldLink and tap **Report Incident**. Log a *Landslide on NH-10*.
2. **Phone A** stores the report locally in SQLite outbox queue and advertises packet via BLE.
3. Bring **Phone B** within radio range (5-30 meters). **Phone B** receives packet, verifies HMAC integrity, adds packet to its local relay queue, and acknowledges receipt to **Phone A**.
4. Move **Phone B** towards **Phone C**.
5. **Phone C** receives the packet via BLE and automatically syncs it to the PRAVAHA server API (`/api/v1/mesh/sync`).
6. **Command Center Dashboard** updates in real-time showing the new incident on the map and triggering RouteGuard re-routing!
