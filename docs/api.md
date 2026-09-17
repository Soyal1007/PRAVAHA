# PRAVAHA REST & WebSocket API Specification

## Core Endpoints (`/api/v1`)

### 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` - Create user account with role permissions.
- `POST /api/v1/auth/login` - Generate JWT access token.

### 2. Incidents & Field Reports (`/api/v1/incidents`)
- `GET /api/v1/incidents` - List all verified road incidents and field reports.
- `POST /api/v1/incidents` - Submit new incident; triggers AlertNet notifications & RouteGuard updates.

### 3. RouteGuard Intelligence (`/api/v1/routes`)
- `POST /api/v1/routes/calculate` - Calculate optimal logistics route combining Google Maps Routes API with PRAVAHA risk scoring.

### 4. Disruption Risk Engine (`/api/v1/risk`)
- `POST /api/v1/risk/evaluate` - Evaluate road segment vulnerability based on rainfall, slope, and satellite surface change.

### 5. Mesh Gateway Sync (`/api/v1/mesh`)
- `POST /api/v1/mesh/sync` - Process store-and-forward mesh packets uploaded by gateway nodes.

### 6. Earth Intelligence (`/api/v1/satellite`)
- `GET /api/v1/satellite/change-detection` - Retrieve before/after Sentinel-1/2 SAR change detection analysis.

### 7. Real-Time Telemetry & Events (`/ws/live`)
- WebSocket endpoint broadcasting vehicle positions, new incidents, and emergency alerts.
