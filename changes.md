PRAVAHA IS NOW MOVING FROM PROTOTYPE TO OPERATIONAL PRODUCT.

The current PRAVAHA interface has become overloaded and confusing.

I do NOT want another visual patch.

I want a complete product-level redesign of PRAVAHA's frontend, navigation, information architecture, permissions, workflows, and presentation.

The goal is:

PRAVAHA must look and behave like a serious operational GIS/logistics intelligence platform that could realistically be used by government logistics authorities, district officials, field officers, fleet operators and emergency coordinators.

It must NOT look like an AI-generated demo dashboard.

===========================================================
1. FIRST: AUDIT THE EXISTING SYSTEM
===========================================================

Before changing anything:

Inspect the entire existing PRAVAHA codebase.

Understand:

- current frontend architecture
- backend architecture
- database
- authentication
- user model
- existing roles
- route structure
- APIs
- Google Maps integration
- Risk Engine
- ML integration
- Earth Intelligence
- FleetPulse
- SupplyGrid
- RouteGuard
- FieldLink
- AlertNet
- BLE Mesh
- n8n/voice integration
- satellite workflows
- existing components
- existing mock/demo data
- hardcoded values
- placeholder APIs
- fake status indicators
- unused components

Do NOT immediately start rewriting components.

First determine what is real, what is connected, what is simulated, what is hardcoded and what is incomplete.

Create an internal architecture map before modifying the application.

===========================================================
2. CORE PRODUCT PRINCIPLE
===========================================================

PRAVAHA must be:

ROLE → RESPONSIBILITY → WORKFLOW → ACTION

NOT:

FEATURE → FEATURE → FEATURE → FEATURE

Every user should see only the functionality relevant to their responsibility.

A user should never be overwhelmed by modules they are not authorized or expected to use.

===========================================================
3. ROLE-BASED PRODUCT ARCHITECTURE
===========================================================

Implement proper role-based access control.

At minimum support these roles:

A. NATIONAL / REGIONAL LOGISTICS ADMINISTRATOR
B. STATE / AUTHORITY OPERATIONS OFFICER
C. DISTRICT OPERATIONS OFFICER
D. FIELD OFFICER
E. FLEET / TRANSPORT OPERATOR
F. EMERGENCY / INCIDENT COORDINATOR
G. SYSTEM ADMINISTRATOR

If the existing authentication architecture already contains roles, reuse it rather than creating a conflicting system.

===========================================================
4. ROLE PERMISSION MATRIX
===========================================================

Create a centralized permission system.

Example:

LOGISTICS ADMINISTRATOR:
- regional overview
- all districts
- supply network
- fleet overview
- route intelligence
- risk intelligence
- analytics
- reports
- emergency coordination
- user management
- system configuration

STATE / AUTHORITY OFFICER:
- state operations
- district monitoring
- route accessibility
- fleet
- supply
- incidents
- alerts
- reports

DISTRICT OFFICER:
- district command center
- local roads
- vehicles
- shipments
- incidents
- field reports
- local alerts
- emergency routes

FIELD OFFICER:
- assigned incidents
- report incident
- capture photo
- GPS location
- assigned tasks
- route to incident
- offline synchronization
- receive operational alerts

FLEET OPERATOR:
- assigned vehicles
- vehicle locations
- active shipments
- route status
- driver status
- ETA
- route deviations
- delivery status

EMERGENCY COORDINATOR:
- active incidents
- affected corridors
- emergency routes
- emergency shipments
- field teams
- alert preparation
- incident escalation

SYSTEM ADMINISTRATOR:
- users
- roles
- integrations
- system health
- API configuration
- audit logs
- model/integration administration

Do not simply hide buttons visually.

Unauthorized routes must also be protected at the routing and backend permission level.

===========================================================
5. NEW NAVIGATION MODEL
===========================================================

REMOVE THE CURRENT FEATURE-DUMP NAVIGATION.

Do NOT expose every PRAVAHA capability in one permanent sidebar.

Instead use role-specific navigation.

For example:

LOGISTICS ADMINISTRATOR:

Overview
Operations
Live Map
Routes
Fleet
Supply
Incidents
Risk Intelligence
Reports
Administration

DISTRICT OFFICER:

District Overview
Live Map
Incidents
Routes
Fleet
Supplies
Field Teams
Reports

FIELD OFFICER:

My Tasks
Nearby Incidents
Report Incident
My Route
Messages
Offline Sync

FLEET OPERATOR:

Fleet
Vehicles
Shipments
Routes
Delivery Issues

EMERGENCY COORDINATOR:

Emergency Overview
Active Incidents
Affected Areas
Emergency Routes
Response Teams
Alerts

Only show navigation appropriate to the authenticated role.

===========================================================
6. REMOVE THE CURRENT TOP-BAR FEATURE CLUTTER
===========================================================

The current top bar contains too many unrelated actions.

Remove or redesign:

- BLE Mesh button
- Tour button
- Report button
- AI Bot button
- Online status as a large standalone control
- unnecessary global feature buttons

Do NOT remove the underlying functionality.

Move each function into its correct operational context.

Examples:

BLE Mesh:
→ connectivity status in relevant FieldLink/offline workflows
→ dedicated Resilient Communications page for authorized users

AI:
→ should be invisible as a marketing feature
→ AI recommendations appear naturally inside operational workflows

Report:
→ incident reporting belongs inside Incidents / FieldLink

Tour:
→ role-based onboarding/help, accessible through Help

System status:
→ compact status indicator

===========================================================
7. REMOVE "AI MODEL STUDIO" AS A MAIN PRODUCT EXPERIENCE
===========================================================

The current:

"PRAVAHA AI/ML Intelligence & Model Studio"

looks like a developer demonstration.

This should NOT be a major operational workspace.

AI is infrastructure.

Users should not have to understand:

- model versions
- FastAPI
- prediction endpoints
- feature test benches
- model presets
- API JSON payloads

unless they are authorized system administrators.

Move technical model diagnostics to:

Administration
→ Intelligence Infrastructure
→ Model Health

For normal users:

Risk Intelligence should simply show:

Risk:
HIGH

Why:
Heavy rainfall + steep terrain + recent satellite change + vehicle slowdown

Recommended action:
Review corridor and consider alternate route.

Source:
Weather / GIS / Field / ML

This is much more believable.

===========================================================
8. REMOVE ALL DEMO / TESTBENCH UI FROM OPERATIONAL VIEWS
===========================================================

Remove things such as:

- Heavy Landslide preset
- Flash Flood preset
- Normal preset
- sliders used to manually create disasters
- "Execute Model Prediction"
- fake live model controls
- fake scenario buttons
- testbench controls
- developer API payloads
- demo prediction IDs
- hardcoded confidence numbers
- fake "LIVE" labels
- fake telemetry

These belong in a developer/testing environment only.

The operational product must consume actual data.

===========================================================
9. ABSOLUTE RULE: NO FABRICATED DATA
===========================================================

This is critical.

Search the entire project for:

- hardcoded risk scores
- fake GPS coordinates
- fake vehicles
- fake shipments
- fake incident counts
- fake confidence values
- fake satellite results
- fake weather
- fake API status
- fake "online" indicators
- fake timestamps
- fake alerts
- fake analytics

Remove them from production workflows.

If a real integration is unavailable:

DO NOT fabricate the result.

Instead show an honest state:

"Data source unavailable"

"Last synchronized: 14:32 IST"

"Awaiting field confirmation"

"Satellite observation unavailable"

"GPS feed disconnected"

"Weather feed not connected"

This is significantly more credible than fake live data.

===========================================================
10. REAL DATA STATE SYSTEM
===========================================================

Every operational data source should have a clear state:

LIVE
RECENT
STALE
OFFLINE
UNAVAILABLE
PENDING VERIFICATION

Example:

IMD Weather
LIVE · Updated 4 min ago

GPS Fleet
LIVE · 24 vehicles

Field Reports
12 pending verification

Satellite
Last observation 38 min ago

Do NOT call something "live" unless it actually comes from a live/connected source.

===========================================================
11. REDESIGN THE MAIN COMMAND CENTER
===========================================================

The Command Center should be the heart of PRAVAHA.

Do NOT use a giant marketing hero.

The first screen should answer:

1. What is happening?
2. Where is it happening?
3. What requires attention?
4. What is affected?
5. What should the operator do?

Suggested structure:

--------------------------------------------------
PRAVAHA COMMAND CENTER

Northeast Region
26 September 2026 · 09:42 IST

[Regional Status] [Active Incidents] [At-Risk Corridors]
[Delayed Shipments] [Field Reports]
--------------------------------------------------

LEFT:
Operational alerts / priority queue

CENTER:
Large interactive GIS map

RIGHT:
Selected incident / corridor details

BOTTOM:
Fleet / supply / response summary
--------------------------------------------------

The map should be the dominant visual element.

===========================================================
12. MAP-FIRST DESIGN
===========================================================

PRAVAHA is fundamentally a GIS/logistics platform.

The map should therefore receive more visual importance than decorative cards.

Use:

Google Maps as the primary map where already integrated.

Overlay:

- roads
- closures
- incidents
- vehicles
- shipments
- warehouses
- hospitals
- emergency routes
- flood areas
- landslide susceptibility
- field reports
- weather
- satellite-derived changes

Use a clean layer control.

Do not display every layer simultaneously.

Allow operators to turn layers on/off.

===========================================================
13. INCIDENT-FIRST WORKFLOW
===========================================================

Create a proper incident workflow.

Incident lifecycle:

REPORTED
↓
UNDER REVIEW
↓
VERIFIED
↓
ACTIVE
↓
RESOLVED
↓
ARCHIVED

Each incident should have:

- incident ID
- location
- source
- timestamp
- severity
- status
- affected road
- affected district
- nearby vehicles
- affected shipments
- evidence
- photos
- weather context
- terrain context
- satellite evidence where available
- field verification
- recommended action
- audit history

This should feel like an actual operations system.

===========================================================
14. ROUTEGUARD REDESIGN
===========================================================

RouteGuard should not look like a generic AI feature.

Workflow:

Origin
↓
Destination
↓
Vehicle
↓
Cargo
↓
Priority
↓
Route calculation
↓
Risk analysis
↓
Alternative routes

Show:

Recommended route
Estimated travel time
Risk level
Known restrictions
Potential disruptions
Alternative route
Estimated delay

Example:

ROUTE A
2h 48m
Risk: Moderate
1 active incident

ROUTE B
3h 11m
Risk: Low
No active closures

Do NOT label a route "best" using subjective AI language.

Show measurable tradeoffs.

===========================================================
15. FLEETPULSE REDESIGN
===========================================================

Fleet operators need operational information, not AI explanations.

Show:

Vehicle
Driver
Current location
Shipment
Destination
ETA
Route
Status
Last GPS update

Statuses:

Moving
Stopped
Delayed
Offline
Route deviation
At destination

Clicking a vehicle opens its operational details.

===========================================================
16. SUPPLYGRID REDESIGN
===========================================================

Focus on:

Warehouses
Inventory
Demand
Shipments
Shortages
Critical supplies
Affected routes

Show relationships:

WAREHOUSE
↓
SHIPMENT
↓
VEHICLE
↓
DESTINATION

If a route becomes unavailable:

Affected shipments:
3

Affected destinations:
2

Available alternate depot:
Depot B

Recommended transfer:
X units

This is far more useful than another dashboard card.

===========================================================
17. EARTH INTELLIGENCE
===========================================================

Keep Earth Intelligence, but redesign it as an operational intelligence workflow.

Do NOT show it as:

"AI satellite demo"

Instead:

EARTH INTELLIGENCE

Area:
[Selected corridor / district]

Observation:
Before / After

Observed change:
Surface change detected

Evidence:
Sentinel-1
Sentinel-2
MOSDAC
Other connected source

Confidence:
Only show confidence if genuinely calculated.

Then:

Potential operational impact:
Road accessibility may be affected.

Action:
Request field verification.

The system must never pretend satellite imagery itself proves a road closure unless the actual methodology supports that conclusion.

===========================================================
18. RISK INTELLIGENCE
===========================================================

Rename/reframe the current ML interface.

Do not expose raw model mechanics.

Instead show:

RISK INTELLIGENCE

Corridor:
NH-10

Risk:
HIGH

Contributing factors:

Heavy rainfall
Steep terrain
Historical incidents
Recent surface change
Vehicle speed anomaly

Evidence:

Weather
GIS
Satellite
Fleet
Field

Recommended action:

"Review corridor accessibility and consider alternate routing."

This is how AI should appear in a serious operational platform:

QUIETLY.

AI should support the decision rather than become the product itself.

===========================================================
19. ALERTNET
===========================================================

Create a professional alert workflow.

Alert:

Draft
↓
Review
↓
Approve
↓
Dispatch
↓
Delivery
↓
Acknowledgement

Different recipients:

Public
Drivers
Field officers
District authorities
Logistics operators

Do not allow AI to directly send emergency public alerts.

Critical alerts require authorized human approval.

===========================================================
20. FIELDLINK
===========================================================

FieldLink should be clearly separated from the Command Center.

It is a mobile field workflow.

Primary actions:

My Tasks
Report Incident
Capture Evidence
Current Location
Assigned Route
Offline Reports
Sync Status

The field officer should be able to perform the most important task within seconds.

Do NOT give field officers the entire Command Center.

===========================================================
21. BLE MESH
===========================================================

BLE Mesh should be treated as infrastructure.

Do not place it as a flashy global marketing button.

Create:

RESILIENT COMMUNICATIONS

Show:

Connectivity:
Internet
Cellular
BLE relay
Offline queue

Nearby nodes
Last synchronization
Pending messages
Gateway status

For field officers:

"3 reports waiting for synchronization"

"Relay connection available"

"Last server sync: 08:42"

Only expose technical diagnostics to authorized users.

===========================================================
22. DESIGN SYSTEM — COMPLETE VISUAL MAKEOVER
===========================================================

The current UI looks too AI-generated.

Move away from:

- giant gradient hero sections
- excessive rounded cards
- purple AI gradients
- excessive pill-shaped controls
- glowing elements
- unnecessary badges
- huge typography
- decorative AI language
- excessive shadows
- dashboard-card overload
- "AI-powered" labels everywhere

Use a mature enterprise GIS design language.

Reference the visual discipline of:

- government operations systems
- aviation control systems
- logistics control towers
- enterprise GIS
- emergency management software
- fleet management platforms

NOT:

- AI startup landing pages
- crypto dashboards
- futuristic AI interfaces
- gaming interfaces

===========================================================
23. COLOR SYSTEM
===========================================================

Use a restrained professional palette.

Base:

White
Off-white
Light grey
Slate
Deep navy

Primary:

Deep teal / institutional blue

Semantic:

Green = normal
Amber = warning
Orange = elevated
Red = critical

Purple should NOT be the dominant UI color.

Avoid neon.

Avoid gradients unless genuinely necessary.

===========================================================
24. TYPOGRAPHY
===========================================================

Use a professional readable typeface such as:

Inter

or an equivalent enterprise UI font.

Hierarchy should be clear.

Do not use enormous headings that consume operational space.

Information density should be high but readable.

===========================================================
25. CARDS
===========================================================

Reduce card usage.

Not everything needs to be a card.

Use:

- tables
- map overlays
- side panels
- lists
- status rows
- timeline
- split views
- compact metrics

Use cards only where they improve grouping.

===========================================================
26. RESPONSIVE BEHAVIOR
===========================================================

Desktop:

Command Center / GIS operations.

Tablet:

Field/operations.

Mobile:

FieldLink.

Do not attempt to cram the entire desktop Command Center onto mobile.

===========================================================
27. GUIDED TOUR
===========================================================

Keep the Guided Tour feature but make it role-specific.

When a user logs in for the first time:

"Welcome to PRAVAHA"

Then show only the workflows relevant to their role.

Example:

District Officer:

1. Monitor district
2. Review incidents
3. Check route accessibility
4. Track affected shipments
5. Coordinate field response

Allow:

Skip
Next
Replay tour

Do not make the tour itself a prominent top-bar feature.

===========================================================
28. GLOBAL SEARCH
===========================================================

Keep search, but make it operational.

Search:

Road
District
Vehicle
Shipment
Incident
Warehouse
Hospital
Field report

Search results should be grouped by entity.

Example:

ROAD
NH-10

INCIDENT
INC-2048

VEHICLE
TRK-104

SHIPMENT
MED-892

===========================================================
29. COMMAND CENTER INFORMATION HIERARCHY
===========================================================

Every page should answer:

WHERE AM I?
WHAT IS HAPPENING?
WHAT NEEDS ATTENTION?
WHAT CAN I DO?

Never make users hunt through menus.

===========================================================
30. AUTHENTICATION + AUTHORIZATION
===========================================================

Implement proper role-based access.

Permissions should be centralized.

Example:

permissions.ts

roles.ts

route guards

API authorization

UI permission checks

Do not rely only on frontend hiding.

Backend must enforce authorization.

===========================================================
31. AUDIT LOG
===========================================================

For operational actions maintain an audit trail.

Examples:

User
Action
Timestamp
Entity
Previous state
New state

Examples:

Officer verified incident
Shipment rerouted
Alert approved
Vehicle assigned
Road marked inaccessible
Incident resolved

This makes the system feel like an actual operational platform.

===========================================================
32. DEMO DATA POLICY
===========================================================

I understand that during development some data may not be connected yet.

However:

DO NOT disguise mock data as real data.

If mock data is temporarily required:

Mark it internally as development-only.

Never present:

"LIVE"
"REAL-TIME"
"94.2% CONFIDENCE"
"24 VEHICLES ONLINE"

unless the backend actually supplies those values.

Production UI must use real backend responses.

===========================================================
33. ERROR / EMPTY STATES
===========================================================

Create professional states.

Examples:

NO ACTIVE INCIDENTS

"No verified incidents currently require attention."

OFFLINE

"Unable to reach PRAVAHA services.
Last synchronization: 09:14 IST."

NO GPS

"Vehicle has not transmitted a location for 18 minutes."

SATELLITE DATA UNAVAILABLE

"No recent observation available for this area."

This is much more credible than fabricated content.

===========================================================
34. PERFORMANCE
===========================================================

Do not sacrifice performance for visual effects.

Optimize:

- map rendering
- API calls
- WebSocket updates
- large vehicle datasets
- incident layers
- GIS layers
- tables
- satellite imagery

Use pagination, clustering, lazy loading and caching where appropriate.

===========================================================
35. REMOVE VISUAL NOISE
===========================================================

Audit every page.

If a component does not help the user:

UNDERSTAND
MONITOR
DECIDE
ACT

remove it.

===========================================================
36. FINAL PRODUCT STRUCTURE
===========================================================

Target structure:

PRAVAHA
│
├── Overview
├── Operations
│   ├── Command Center
│   ├── Live Map
│   └── Incidents
│
├── Logistics
│   ├── Routes
│   ├── Fleet
│   └── Supply
│
├── Intelligence
│   ├── Risk Intelligence
│   └── Earth Intelligence
│
├── Communications
│   ├── Alerts
│   └── Resilient Communications
│
├── Reports
│
└── Administration
    ├── Users & Roles
    ├── Integrations
    ├── System Health
    ├── Audit Logs
    └── Intelligence Infrastructure

But navigation must still change according to user role.

===========================================================
37. MOST IMPORTANT UX RULE
===========================================================

When a user logs in, PRAVAHA should immediately answer:

"What do I need to know or do?"

NOT:

"Here are all the features PRAVAHA has."

===========================================================
38. VISUAL QUALITY BAR
===========================================================

The final interface must look like a real enterprise product.

It should be:

Professional
Calm
Operational
Information-dense
Readable
Map-centric
Trustworthy
Government/enterprise appropriate

It should NOT look:

Futuristic
Gimmicky
AI-generated
Gaming-like
Overdesigned
Marketing-heavy
Prototype-like

===========================================================
39. IMPLEMENTATION STRATEGY
===========================================================

Do this in stages.

PHASE 1:
Audit existing application.

PHASE 2:
Implement authentication/roles/permissions architecture.

PHASE 3:
Redesign information architecture/navigation.

PHASE 4:
Redesign Command Center.

PHASE 5:
Redesign Live Map and operational workflows.

PHASE 6:
Redesign RouteGuard/FleetPulse/SupplyGrid.

PHASE 7:
Redesign Risk Intelligence/Earth Intelligence.

PHASE 8:
Move technical ML/BLE diagnostics into Administration.

PHASE 9:
Remove fake/demo data from production views.

PHASE 10:
Connect all available real backend/API data.

PHASE 11:
Implement professional loading/error/empty/offline states.

PHASE 12:
Performance and accessibility pass.

PHASE 13:
Full end-to-end testing.

===========================================================
40. DO NOT DESTROY EXISTING FUNCTIONALITY
===========================================================

Before deleting or replacing an existing module:

Determine whether it contains real functionality.

Preserve useful:

- APIs
- backend logic
- database schemas
- Google Maps integration
- ML integration
- BLE implementation
- offline synchronization
- satellite processing
- routing logic
- authentication

The goal is:

RESTRUCTURE + CONNECT + IMPROVE

NOT:

DELETE EVERYTHING AND MAKE ANOTHER MOCK.

===========================================================
41. FINAL ACCEPTANCE CRITERIA
===========================================================

Do not consider this task complete until:

[ ] Role-based navigation exists
[ ] Backend authorization exists
[ ] Unauthorized routes are protected
[ ] Command Center is redesigned
[ ] Map is the operational center
[ ] Navigation is task-oriented
[ ] AI Model Studio is removed from normal user navigation
[ ] Developer/testbench controls are removed from production UI
[ ] Fake/demo data is removed from operational workflows
[ ] Real data states are clearly represented
[ ] RouteGuard is operationally understandable
[ ] FleetPulse is operationally understandable
[ ] SupplyGrid is operationally understandable
[ ] Risk Intelligence is understandable without ML knowledge
[ ] Earth Intelligence is evidence-driven
[ ] AlertNet has approval workflow
[ ] FieldLink is role-specific
[ ] BLE Mesh is treated as infrastructure
[ ] Audit logs exist
[ ] Loading/error/offline states exist
[ ] UI no longer looks AI-generated
[ ] UI no longer feels like a collection of demos
[ ] Existing working backend functionality is preserved
[ ] No fake API responses are presented as live data
[ ] No fabricated confidence/accuracy values are displayed
[ ] No unsupported claims are displayed
[ ] Application has been tested end-to-end

===========================================================
FINAL INSTRUCTION
===========================================================

DO NOT optimize for "wow" through visual effects.

Optimize for:

CLARITY
TRUST
OPERABILITY
REALISM
DATA PROVENANCE
ROLE-BASED ACTION
GIS INTELLIGENCE
LOGISTICS WORKFLOW

The judges should be able to understand PRAVAHA within 30 seconds without us explaining every button.

When they log in, they should immediately understand:

WHO THEY ARE
WHERE THEY ARE OPERATING
WHAT IS HAPPENING
WHAT IS AT RISK
WHAT ACTION THEY CAN TAKE

Make PRAVAHA feel like a real system that happens to contain AI,
NOT an AI demo that happens to contain a logistics dashboard.