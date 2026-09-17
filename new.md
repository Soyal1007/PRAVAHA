You are now the lead software architect, senior full-stack engineer, Flutter/Android engineer, GIS engineer, backend engineer, and ML systems engineer responsible for transforming the EXISTING PRAVAHA project into a genuinely functional, testable software platform.

IMPORTANT:
This is NOT a request to create another UI prototype.
This is NOT a request to create fake buttons, simulated dashboards, placeholder workflows, or a presentation-only demo.

PRAVAHA is being developed as a real Smart India Hackathon solution for:

Problem Statement ID: 26002
Title:
“AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)”

Product:
PRAVAHA

Tagline:
“Predict. Navigate. Deliver.”

Core objective:
Build a real logistics intelligence and resilient communication platform for the North Eastern Region of India that can monitor accessibility, detect/predict disruptions, optimize routes, track vehicles and essential shipments, process field reports, use satellite/GIS intelligence, operate offline, and communicate through peer-to-peer connectivity when conventional Internet connectivity is unavailable.

==================================================
0. FIRST RULE — INSPECT BEFORE MODIFYING
==================================================

Before changing anything:

1. Thoroughly inspect the existing project.
2. Understand the current folder structure.
3. Identify:
   - frontend
   - backend
   - APIs
   - database
   - map implementation
   - authentication
   - state management
   - existing modules
   - existing components
   - existing mock data
   - existing API integrations
   - existing environment variables
   - existing satellite/GIS work
   - existing routing logic
   - existing vehicle/incident/shipment logic
4. Determine which parts are actually functional and which parts are only UI/demo implementations.
5. Preserve useful existing functionality.
6. Refactor instead of unnecessarily rewriting working code.
7. Do NOT destroy existing PRAVAHA functionality merely to introduce the new architecture.
8. Create a technical migration plan internally before modifying the codebase.

After inspection, implement the architecture described below.

==================================================
1. NEW PRAVAHA PRODUCT ARCHITECTURE
==================================================

PRAVAHA should become a multi-application platform:

A. PRAVAHA COMMAND CENTER
   - Existing web application
   - Desktop/PC oriented
   - Next.js/React/TypeScript
   - Google Maps
   - GIS dashboards
   - fleet monitoring
   - supply monitoring
   - satellite intelligence
   - route optimization
   - analytics
   - administration

B. PRAVAHA FIELDLINK
   - NEW Flutter Android application
   - designed specifically for field officers/drivers/responders
   - GPS
   - camera
   - incident reporting
   - offline-first operation
   - local database
   - synchronization
   - BLE peer-to-peer communication
   - store-and-forward messaging
   - field alerts

C. PRAVAHA BACKEND
   - Shared backend
   - FastAPI/Python preferred
   - PostgreSQL
   - PostGIS
   - Redis where useful
   - WebSockets
   - authentication
   - REST APIs
   - event processing

D. PRAVAHA INTELLIGENCE LAYER
   - Risk Engine
   - RouteGuard
   - Earth Intelligence
   - ETA prediction
   - GPS anomaly detection
   - supply intelligence
   - alert engine
   - ML services

E. PRAVAHA RESILIENT COMMUNICATION LAYER
   - native Android BLE communication
   - store-and-forward
   - offline queue
   - peer discovery
   - message routing
   - acknowledgements
   - duplicate prevention
   - TTL/hop limits
   - gateway synchronization

==================================================
2. DO NOT TURN EVERYTHING INTO FLUTTER
==================================================

IMPORTANT ARCHITECTURAL DECISION:

Do NOT rewrite the Command Center as Flutter.

Keep the Command Center as the web application unless inspection proves the current architecture is fundamentally unusable.

Recommended:

COMMAND CENTER:
Next.js + React + TypeScript

FIELDLINK:
Flutter + Dart

ANDROID BLE:
Kotlin/native Android

BACKEND:
FastAPI + Python

DATABASE:
PostgreSQL + PostGIS

CACHE / REALTIME:
Redis + WebSockets where appropriate

ML:
Python

Maps:
Google Maps for Command Center

This separation is intentional.

The Command Center is a control-room application.

FieldLink is a field mobility and resilient communication application.

They should look like the same PRAVAHA ecosystem but should NOT have identical UX.

==================================================
3. SHARED BACKEND
==================================================

Create or refactor the backend into a clean API architecture.

Core entities:

User
Role
Organization
District
State
Road
RoadSegment
Vehicle
Driver
Shipment
Commodity
Warehouse
Hospital
Incident
FieldReport
Alert
Route
RouteAlternative
WeatherObservation
SatelliteObservation
SatelliteChangeDetection
RiskAssessment
SupplyStatus
MeshNode
MeshMessage
SyncEvent

Use proper relationships.

Use PostgreSQL + PostGIS for geographic data.

Use UUIDs where appropriate.

Store timestamps in UTC internally.

Store geometry using appropriate PostGIS types.

Support:
- Point
- LineString
- Polygon
- MultiPolygon where required.

Create proper indexes for:
- latitude/longitude
- geometry
- timestamp
- status
- severity
- road ID
- vehicle ID
- shipment ID

==================================================
4. API ARCHITECTURE
==================================================

Create clean API modules:

/auth
/users
/roads
/vehicles
/shipments
/incidents
/field-reports
/routes
/risk
/weather
/satellite
/supply
/alerts
/mesh
/sync
/analytics

Use proper validation.

Do not trust client input.

Add:
- authentication
- authorization
- role-based permissions
- request validation
- rate limiting where appropriate
- structured error responses
- logging
- audit logs for critical actions.

The API must be usable by BOTH:

Command Center
AND
FieldLink.

==================================================
5. REAL-TIME COMMUNICATION
==================================================

Use WebSockets or another appropriate real-time mechanism for:

- incident updates
- vehicle positions
- shipment updates
- road closures
- alerts
- risk changes
- mesh gateway synchronization
- command-center notifications

Example:

FieldLink submits:

LANDSLIDE REPORT

Backend processes it.

Command Center receives:

NEW INCIDENT

without manually refreshing the browser.

==================================================
6. PRAVAHA FIELDLINK — FLUTTER
==================================================

Create a proper Flutter project inside the repository.

Suggested:

/apps
   /command-center
   /fieldlink

or another clean monorepo structure appropriate to the existing project.

FieldLink should have:

Authentication
Home
Map
Report Incident
My Reports
Alerts
Connectivity
Mesh
Sync Status
Settings

Design principle:

FIELD OFFICER SHOULD BE ABLE TO REPORT AN INCIDENT IN LESS THAN 20 SECONDS.

Main actions:

ROAD BLOCK
LANDSLIDE
FLOOD
BRIDGE DAMAGE
HEAVY RAIN
ACCIDENT
VEHICLE BREAKDOWN
SUPPLY ISSUE
MEDICAL EMERGENCY
OTHER

Report should support:

- automatic GPS
- timestamp
- incident type
- severity
- optional description
- photo
- optional video
- optional voice note later
- road/location
- offline storage

==================================================
7. FIELDLINK OFFLINE-FIRST ARCHITECTURE
==================================================

FieldLink MUST continue functioning without Internet.

Do NOT make the app dependent on API availability for basic field operations.

Implement:

Local database:
SQLite / Drift / Isar or another reliable Flutter local database.

Store locally:

- user session metadata
- field reports
- incident drafts
- outgoing messages
- received messages
- alerts
- route information
- cached map-related metadata
- sync state
- mesh peers
- mesh messages

When Internet disappears:

The app should continue operating.

Example:

Officer creates:

LANDSLIDE REPORT

No Internet.

Result:

LOCAL_ONLY

The report enters:

OUTBOX

When Internet returns:

OUTBOX
   ↓
SYNC ENGINE
   ↓
SERVER
   ↓
ACKNOWLEDGEMENT
   ↓
SYNCED

Never lose the report because the Internet disappeared.

==================================================
8. REAL BLUETOOTH PEER-TO-PEER COMMUNICATION
==================================================

THIS IS ONE OF THE MOST IMPORTANT REQUIREMENTS.

Do NOT implement a fake "mesh" UI.

Do NOT simulate connected devices.

Do NOT use hardcoded peers.

Do NOT create a screen saying "Mesh Connected" without actual Bluetooth communication.

Implement ACTUAL Android BLE communication.

Flutter handles the UI and application logic.

Use native Android/Kotlin where necessary for reliable BLE functionality.

Use Flutter platform channels or a properly structured Flutter plugin layer to communicate between Dart and Android Kotlin.

Android Bluetooth permissions must be handled correctly for modern Android versions.

Required capabilities:

1. BLE scanning
2. BLE advertising
3. peer discovery
4. peer identification
5. connection establishment
6. message exchange
7. acknowledgement
8. disconnection/reconnection
9. duplicate prevention
10. TTL/hop count
11. store-and-forward
12. gateway synchronization

==================================================
9. MESH NODE IDENTITY
==================================================

Each FieldLink installation should have a unique:

node_id

Example:

PRV-A7F291

Do NOT use phone number as the node ID.

Generate and persist the node ID locally.

Store:

node_id
device_name
app_version
last_seen
capabilities
battery_level if available
connectivity_state
mesh_state

==================================================
10. MESH MESSAGE FORMAT
==================================================

Create a real message envelope.

Example conceptual structure:

{
  "message_id": "UUID",
  "origin_node_id": "PRV-A7F291",
  "sender_node_id": "PRV-B81921",
  "type": "INCIDENT_REPORT",
  "priority": "CRITICAL",
  "created_at": "...",
  "ttl": 8,
  "hop_count": 2,
  "requires_ack": true,
  "payload": {...}
}

Do not blindly use this exact JSON if another serialization format is technically better.

You may use JSON, CBOR, protobuf, or another appropriate format.

The important thing is:

MESSAGES MUST BE REAL.

==================================================
11. MESSAGE ROUTING
==================================================

Implement store-and-forward.

Example:

PHONE A
   ↓ BLE
PHONE B
   ↓ BLE
PHONE C
   ↓ Internet
SERVER

A creates:

INC-123

A has no Internet.

A sends to B.

B checks:

Have I already received message_id INC-123?

If NO:
- store it
- acknowledge it
- attempt forwarding

If YES:
- reject duplicate
- do not forward duplicate

When C receives it and has Internet:

C uploads to server.

Server acknowledges successful synchronization.

Message state should transition:

CREATED
↓
QUEUED
↓
SENT
↓
RECEIVED
↓
FORWARDED
↓
GATEWAY_RECEIVED
↓
SERVER_SYNCED

Support:

FAILED
EXPIRED
DUPLICATE

==================================================
12. TTL AND HOP LIMIT
==================================================

Every mesh message must have:

ttl
hop_count

Example:

TTL = 8

Every forwarding event:

hop_count += 1
ttl -= 1

If TTL <= 0:

STOP FORWARDING.

This prevents infinite circulation.

==================================================
13. MESSAGE PRIORITY
==================================================

Implement:

CRITICAL
HIGH
NORMAL
LOW

Examples:

CRITICAL:
- landslide blocking highway
- medical emergency
- bridge collapse

HIGH:
- road closure
- flood warning

NORMAL:
- routine field report

LOW:
- diagnostic telemetry

Critical messages should receive forwarding priority.

==================================================
14. ACTUAL DATA TRANSMISSION
==================================================

The mesh must transmit actual payloads.

At minimum test:

A → B:

"NH-10 BLOCKED"

Then:

A → B → C:

"Landslide at location X"

Then:

A → B → C → SERVER:

Structured incident JSON.

After this works, implement small binary payload transfer.

Support small compressed images later.

DO NOT attempt large video transfer through BLE mesh.

For large files:

store locally
wait for Internet
upload through normal Internet synchronization.

==================================================
15. IMAGE CHUNKING
==================================================

For small incident photographs:

Implement optional chunking.

Example:

IMAGE
 ↓
COMPRESS
 ↓
SPLIT INTO CHUNKS
 ↓
CHUNK 1
CHUNK 2
CHUNK 3
...
 ↓
TRANSFER
 ↓
REASSEMBLE
 ↓
HASH VERIFY
 ↓
STORE

Each chunk must include:

message_id
file_id
chunk_index
total_chunks
checksum

Only implement this once reliable text/JSON messaging is working.

Do not make image transfer block normal emergency messages.

==================================================
16. MESH SECURITY
==================================================

Do not send sensitive information completely unauthenticated.

At minimum implement:

- unique node IDs
- message IDs
- integrity verification
- replay protection
- timestamps
- TTL
- authenticated server synchronization

Where feasible implement message signing or authenticated encryption.

Do NOT invent cryptography.

Use established libraries and algorithms.

==================================================
17. MESH CONNECTIVITY UI
==================================================

FieldLink should show:

Internet:
CONNECTED / DISCONNECTED

Bluetooth:
ON / OFF

Mesh:
ACTIVE / INACTIVE

Peers:
3

Gateway:
AVAILABLE / NONE

Queued:
5

Synced:
23

Example:

PRAVAHA CONNECTIVITY

Internet       OFFLINE
Bluetooth      ON
Mesh           ACTIVE
Nearby Nodes   3
Gateway        FOUND

Outgoing Queue
5 messages

Last Sync
2 min ago

This must display REAL state.

==================================================
18. MESH DIAGNOSTICS
==================================================

Create a developer/admin diagnostic screen.

Show:

Node ID
Bluetooth state
Advertising state
Scanning state
Connected peers
RSSI
Last message
Messages received
Messages forwarded
Messages dropped
Messages duplicated
Messages expired
Queue size
Last gateway sync
Battery level if available
Errors

This will be extremely useful when testing on physical phones.

==================================================
19. THREE-PHONE TEST MODE
==================================================

Create an explicit real-world testing workflow.

Phone A:
FIELD OFFICER

Phone B:
RELAY NODE

Phone C:
GATEWAY

Test:

A disables Internet.

A creates:

CRITICAL LANDSLIDE REPORT

A stores it locally.

B discovers A.

A transfers message to B.

B acknowledges it.

B stores message.

C discovers B / B forwards to C.

C has Internet.

C synchronizes message with PRAVAHA server.

Command Center receives the incident.

Command Center map displays the incident.

Risk Engine recalculates the road risk.

RouteGuard identifies affected route(s).

AlertNet creates the relevant alert.

This must be a REAL end-to-end workflow.

==================================================
20. COMMAND CENTER CHANGES
==================================================

Improve the existing Command Center rather than replacing it.

Add:

CONNECTIVITY NETWORK

Map overlay:

PRAVAHA Nodes

Show:

FIELDLINK NODE
ONLINE
OFFLINE
MESH
GATEWAY

Example:

PRV-A7F291
● ONLINE

PRV-B81921
● MESH RELAY

PRV-C91283
● GATEWAY

This should come from real backend/mesh data whenever available.

==================================================
21. FIELD REPORT INTEGRATION
==================================================

Every FieldLink report should become a backend incident.

Example:

FieldLink:
LANDSLIDE

↓

Backend:
INCIDENT CREATED

↓

Command Center:
INCIDENT APPEARS

↓

Risk Engine:
RISK INCREASE

↓

RouteGuard:
ROUTE RECALCULATION

↓

AlertNet:
ALERT

↓

Affected vehicles:
NOTIFIED

This is the core PRAVAHA loop.

==================================================
22. ROUTEGUARD
==================================================

Improve RouteGuard to actually calculate routes rather than showing static routes.

Use Google Maps Routes API or another appropriate routing service for base routing.

Then PRAVAHA adds its own intelligence.

Conceptually:

BASE TRAVEL TIME
+
ROAD CLOSURES
+
HAZARD RISK
+
WEATHER
+
FIELD REPORTS
+
GPS ANOMALIES
+
VEHICLE RESTRICTIONS
+
CARGO PRIORITY

=

PRAVAHA ROUTE SCORE

Do not claim Google Maps itself provides PRAVAHA risk intelligence.

Google Maps is the base mapping/routing layer.

PRAVAHA provides the additional risk and logistics intelligence.

==================================================
23. FLEETPULSE
==================================================

Fleet tracking should use real location data where possible.

FieldLink can act as a mobile GPS source.

Implement:

vehicle_id
driver_id
latitude
longitude
speed
heading
timestamp
route_id
status

Command Center receives updates through backend/WebSocket.

Support:

MOVING
STOPPED
DELAYED
OFF_ROUTE
OFFLINE

==================================================
24. SUPPLYGRID
==================================================

Create actual supply data models.

Warehouse:

inventory
capacity
location

Commodity:

medicine
food
construction materials
agricultural goods
etc.

Shipment:

origin
destination
cargo
priority
vehicle
ETA
status

Use real database relationships.

Implement basic logic:

LOW STOCK
+
ROAD DISRUPTION

→ identify alternate depot

Do not make SupplyGrid purely visual.

==================================================
25. EARTH INTELLIGENCE
==================================================

Continue developing the satellite functionality.

Create a proper module:

EARTH INTELLIGENCE

Capabilities:

- satellite scene metadata
- before/after comparison
- change detection
- flood detection
- terrain intelligence
- environmental anomalies
- fire/hotspot intelligence
- infrastructure change
- satellite-derived risk signals

Potential data sources:

Sentinel-1
Sentinel-2
Landsat
MOSDAC
NESDR/NESAC
NASA FIRMS
SRTM/DEM
GSI
IMD

Do not fabricate API keys.

Use environment variables.

If an external source requires authentication:

create an integration interface and configuration.

Do not pretend the integration is live if credentials are unavailable.

==================================================
26. BEFORE/AFTER SATELLITE ANALYSIS
==================================================

Create a real pipeline where possible:

AOI
↓
Before image
↓
After image
↓
Preprocessing
↓
Normalization
↓
Change detection
↓
Change mask
↓
Risk interpretation
↓
Command Center

Support visual comparison:

SIDE BY SIDE

SWIPE

OPACITY

DIFFERENCE

CHANGE MASK

Show:

source
date
resolution
cloud coverage if available
processing status
confidence

==================================================
27. SATELLITE CHANGE DETECTION
==================================================

Do not immediately train a giant AI model.

Start with scientifically reasonable processing.

For optical imagery, consider:

NDVI
NDWI
NBR

For SAR imagery, consider:

backscatter change
ratio/difference methods

For terrain:

DEM
slope
elevation
terrain susceptibility

Then combine satellite-derived changes with:

rainfall
forecast
terrain
historical incidents
field reports
GPS anomalies

This is much more defensible than claiming:

"Satellite AI predicts landslides."

PRAVAHA should say:

"Earth Intelligence detects environmental and infrastructure changes and feeds evidence into the disruption risk engine."

==================================================
28. RISK ENGINE
==================================================

Create a configurable risk engine.

Example prototype feature model:

terrain susceptibility
recent rainfall
forecast rainfall
flood proximity
historical incidents
road condition
GPS anomaly
satellite change score

Do NOT present prototype weights as scientifically authoritative.

Store weights/configuration so they can be changed.

Risk:

0–20 LOW
21–40 MODERATE
41–60 ELEVATED
61–80 HIGH
81–100 CRITICAL

Return:

risk_score
risk_level
contributing_factors
confidence
timestamp
data_sources

Example:

RISK: 78
HIGH

Contributors:
+ Heavy rainfall
+ High slope
+ Satellite surface change
+ Historical landslide activity
+ GPS slowdown

==================================================
29. ML ARCHITECTURE
==================================================

Do NOT put model training inside the Flutter app or browser.

Create a Python ML service/pipeline.

Possible architecture:

/ml
   /datasets
   /preprocessing
   /training
   /models
   /inference
   /evaluation

Start with:

XGBoost or LightGBM

for disruption-risk prediction.

Possible features:

rainfall_24h
rainfall_72h
forecast_rainfall
slope
elevation
distance_to_river
susceptibility
satellite_change_score
historical_incidents
road_condition
gps_speed_anomaly

Later, if enough labeled imagery exists:

U-Net / Siamese change detection / ChangeFormer / similar model.

Do not train a deep learning model merely for presentation.

Only use it if a suitable dataset and evaluation methodology exist.

Track:

precision
recall
F1
IoU
ROC-AUC where appropriate

Store model version.

==================================================
30. DATASET MANAGEMENT
==================================================

Create a dataset registry.

For every dataset record:

name
source
URL
license
geography
resolution
labels
date range
format
download date
preprocessing
intended use

Potential sources:

NESDR/NESAC
MOSDAC
IMD
GSI
Copernicus
USGS
NASA
SRTM
research datasets
Kaggle supplementary datasets

Kaggle datasets must NOT automatically be treated as authoritative.

Verify licensing and suitability.

==================================================
31. ALERTNET
==================================================

Implement actual alert generation.

Alert examples:

ROAD BLOCKED
LANDSLIDE RISK HIGH
FLOOD RISK HIGH
SHIPMENT DELAYED
VEHICLE OFF ROUTE
SUPPLY SHORTAGE
SATELLITE CHANGE DETECTED
NETWORK OUTAGE
CRITICAL INCIDENT

Each alert:

id
type
severity
source
location
timestamp
status
acknowledgement
affected assets

==================================================
32. HUMAN-IN-THE-LOOP
==================================================

AI-generated risk must not automatically become a confirmed disaster.

Use statuses:

DETECTED
UNDER REVIEW
VERIFIED
ACTIVE
RESOLVED
ARCHIVED

For example:

Satellite detects change.

System:

SATELLITE ANOMALY DETECTED

Not:

LANDSLIDE CONFIRMED

unless verified by authoritative/field evidence.

This distinction is important.

==================================================
33. OFFLINE MAP/LOCAL CACHE
==================================================

FieldLink should cache enough geographic information to remain useful offline.

At minimum cache:

- recent routes
- important roads
- saved locations
- active incidents
- emergency points
- relevant map metadata

Do not attempt to download the entire NER map into the phone unnecessarily.

Design for region-specific caching.

==================================================
34. MULTILINGUAL SUPPORT
==================================================

Architecture should support:

English
Hindi
Assamese

Design localization so additional NER languages can be added later.

Do not hardcode UI strings throughout the app.

==================================================
35. SECURITY
==================================================

Implement:

JWT or secure session mechanism
role-based authorization
secure local storage
HTTPS
API validation
rate limiting
audit logging
secure environment variables
no API keys in frontend source
no secrets in Git
input sanitization

For mesh:

message integrity
replay protection
TTL
message IDs
authenticated gateway/server sync

==================================================
36. ERROR HANDLING
==================================================

Do not let failures silently disappear.

Every important subsystem needs:

loading
success
failure
retry
offline state

Examples:

GPS unavailable
Bluetooth unavailable
permission denied
Internet unavailable
server unavailable
database error
mesh peer disconnected
sync failed
satellite API unavailable

The user must understand what happened.

==================================================
37. OBSERVABILITY
==================================================

Add useful logs.

Backend:

structured logging

FieldLink:

diagnostic logs

Mesh:

peer events
message events
connection events
sync events

Earth Intelligence:

data source
processing state
failure reason

Do not expose sensitive information in logs.

==================================================
38. DEMO MODE — ONLY AS A FALLBACK
==================================================

A demo mode may exist.

BUT:

It must be clearly separated from real mode.

Never mix fake data with real data without labeling it.

Create:

REAL MODE
DEMO MODE

Demo mode should help development/testing.

It must NOT hide the absence of real integrations.

==================================================
39. TESTING
==================================================

This project must be tested as software, not just visually.

Create:

unit tests
API tests
database tests
Flutter tests
integration tests
mesh protocol tests

For mesh specifically test:

A → B
A → B → C
duplicate message
expired message
TTL
ACK
disconnect/reconnect
gateway sync
offline queue
image chunking
corrupted chunk
duplicate chunk
server unavailable
Bluetooth disabled
permission denied

==================================================
40. PHYSICAL DEVICE TESTING
==================================================

The final FieldLink build must be tested on actual Android phones.

Do NOT consider an emulator-only Bluetooth simulation sufficient.

At minimum:

3 physical Android devices.

Test:

Phone A
Phone B
Phone C

with:

A = sender
B = relay
C = gateway

Document actual test results.

==================================================
41. PERFORMANCE
==================================================

Do not block the UI.

Mesh operations must be asynchronous.

Large files must not block emergency messaging.

Database operations must be asynchronous.

Backend APIs should paginate large datasets.

Maps should not render thousands of unnecessary markers simultaneously.

Use clustering where appropriate.

==================================================
42. UI/UX
==================================================

Keep the existing PRAVAHA visual identity.

Premium.
Professional.
Government/enterprise GIS.
Clean.
Light.
Trustworthy.

Avoid:

neon cyberpunk
purple AI gradients
excessive glassmorphism
gaming UI
overly rounded cards
unnecessary animations

Command Center:
dense but readable.

FieldLink:
simple, fast, high-contrast, field-friendly.

The mobile application must prioritize functionality over visual decoration.

==================================================
43. DO NOT CREATE FAKE FUNCTIONALITY
==================================================

This is a HARD REQUIREMENT.

Never implement:

fake GPS
fake Bluetooth peers
fake mesh messages
fake satellite API responses disguised as live
fake vehicle movement disguised as real
fake AI predictions disguised as trained models
fake connectivity status
fake server synchronization

If something cannot be connected yet:

1. create a proper interface
2. implement the real integration architecture
3. clearly label it unavailable/configuration-required
4. provide a controlled development fallback

Never hide limitations.

==================================================
44. ENVIRONMENT VARIABLES
==================================================

Create/update:

.env.example

Potential configuration:

DATABASE_URL
REDIS_URL
JWT_SECRET
GOOGLE_MAPS_API_KEY
GOOGLE_ROUTES_API_KEY
IMD_API_URL
MOSDAC_API_URL
NESDR_API_URL
COPERNICUS_CLIENT_ID
COPERNICUS_CLIENT_SECRET
NASA_FIRMS_API_KEY
OBJECT_STORAGE_URL
OBJECT_STORAGE_KEY

Do not hardcode secrets.

Only include variables that are actually required.

==================================================
45. DOCUMENTATION
==================================================

Create/update:

README.md

Include:

Architecture
Setup
Backend
Command Center
FieldLink
Android setup
Bluetooth permissions
Mesh architecture
Database
API
Environment variables
Satellite integrations
ML
Testing
Physical device testing
Deployment

Also create:

docs/
   architecture.md
   mesh-protocol.md
   fieldlink.md
   api.md
   earth-intelligence.md
   ml.md
   testing.md

==================================================
46. PROJECT STRUCTURE
==================================================

Use a clean structure appropriate to the existing project.

Prefer something similar to:

/apps
    /command-center
    /fieldlink

/services
    /api
    /ml
    /earth-intelligence

/packages
    /shared-models
    /shared-types

/infrastructure
    /docker
    /database

/docs

Adjust this structure if the existing repository has a better architecture.

Do not blindly force this exact structure if it would damage the current project.

==================================================
47. IMPLEMENTATION ORDER
==================================================

Do NOT attempt to build everything simultaneously.

Implement in this order:

PHASE 1
Inspect existing system.

PHASE 2
Stabilize backend and database.

PHASE 3
Connect Command Center to real backend.

PHASE 4
Create Flutter FieldLink.

PHASE 5
Implement offline-first storage.

PHASE 6
Implement real BLE node discovery.

PHASE 7
Implement real A → B messaging.

PHASE 8
Implement A → B → C relay.

PHASE 9
Implement gateway → server synchronization.

PHASE 10
Connect incidents to Command Center.

PHASE 11
Connect incidents to Risk Engine.

PHASE 12
Connect Risk Engine to RouteGuard.

PHASE 13
Implement satellite/Earth Intelligence.

PHASE 14
Implement ML pipeline.

PHASE 15
Security, testing, performance and deployment.

Do not skip ahead simply to make the interface look complete.

==================================================
48. DEFINITION OF DONE
==================================================

Do NOT consider the project finished because:

- pages exist
- buttons exist
- animations exist
- cards display
- mock data appears

The project is considered functionally complete only when:

1. Command Center runs.
2. Backend runs.
3. Database runs.
4. FieldLink runs on a real Android device.
5. FieldLink can obtain real GPS.
6. FieldLink can create a real incident.
7. Incident persists offline.
8. Internet synchronization works.
9. Two phones can actually communicate using BLE.
10. Three phones can demonstrate store-and-forward.
11. A gateway can synchronize with the server.
12. Command Center receives the real incident.
13. Risk Engine processes the incident.
14. RouteGuard reacts to the changed road risk.
15. Alerts are generated.
16. Satellite integrations have real provider interfaces and real data when credentials/data access are available.
17. Before/after analysis works for supported datasets.
18. ML pipeline can train/evaluate/infer when datasets are available.
19. Failures are handled gracefully.
20. Documentation explains how to reproduce everything.

==================================================
49. CRITICAL REAL-WORLD CONSTRAINT
==================================================

Do not claim that BLE mesh guarantees communication during every Internet/cellular outage.

The correct capability is:

"PRAVAHA uses locally available peer-to-peer connectivity and store-and-forward communication to maintain field communication when conventional Internet connectivity is unavailable."

Bluetooth can itself be affected by hardware limitations, distance, radio interference, OS restrictions, battery constraints and device-specific behavior.

Design accordingly.

==================================================
50. FINAL DEVELOPMENT BEHAVIOR
==================================================

Act like a senior engineering team.

Before coding:
INSPECT.

Then:
ARCHITECT.

Then:
IMPLEMENT.

Then:
TEST.

Then:
FIX.

Then:
DOCUMENT.

Do not stop after generating files.

Run the relevant build/test commands.

Fix compile errors.

Fix runtime errors.

Fix type errors.

Fix API errors.

Fix database errors.

Fix Flutter build errors.

Fix Android permission issues.

Test the actual BLE flow wherever physical-device testing is possible.

When something cannot be tested because credentials, hardware, or external services are unavailable, explicitly report:

WHAT WAS TESTED
WHAT WAS NOT TESTED
WHY
WHAT IS REQUIRED

Do not claim success without evidence.

==================================================
FINAL GOAL
==================================================

Transform the existing PRAVAHA project from a prototype/dashboard into a real multi-application platform:

                    PRAVAHA

        ┌─────────────────────────────┐
        │      COMMAND CENTER         │
        │        PC / WEB              │
        └─────────────┬───────────────┘
                      │
                PRAVAHA API
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    RISK ENGINE   ROUTEGUARD   EARTH INTELLIGENCE
        │             │             │
        └─────────────┼─────────────┘
                      │
                FIELDLINK APP
                      │
                Flutter Android
                      │
              ┌───────┴────────┐
              │                │
           INTERNET           BLE
              │                │
              │          ┌─────┴─────┐
              │          │           │
              │        PHONE B     PHONE C
              │          │           │
              └──────────┴───────────┘
                         │
                    SERVER SYNC

The final system must be capable of:

OBSERVE
→ COMMUNICATE
→ UNDERSTAND
→ PREDICT
→ DECIDE
→ ACT
→ TRACK
→ LEARN

Build the actual software required to make this workflow work.

Do not optimize for screenshots.

Optimize for a functioning system that can be installed, tested, demonstrated on real devices, and eventually deployed.