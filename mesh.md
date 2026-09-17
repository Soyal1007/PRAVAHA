PRAVAHA OFFLINE RESILIENCE / MESH COMMUNICATION MODULE

You are now responsible for adding a real, demonstrable offline communication system to the existing PRAVAHA application.

This is NOT a visual mockup.

Build an actual working prototype that I can demonstrate to judges using multiple Android phones.

The purpose is to allow PRAVAHA users to exchange critical operational information when normal Internet/cellular connectivity is unavailable.

==================================================
CORE OBJECTIVE
==================================================

PRAVAHA must not completely stop functioning when Internet connectivity disappears.

Implement:

OFFLINE DATA CAPTURE
+
LOCAL PEER-TO-PEER COMMUNICATION
+
STORE-AND-FORWARD RELAY
+
EVENTUAL CLOUD SYNCHRONIZATION

The system should allow a field officer to create an incident without Internet connectivity.

The incident should be stored locally.

If another nearby PRAVAHA device is available, the report should be transferred to that device.

The receiving device should be able to relay it further.

Eventually, when any participating device has Internet connectivity, the report should synchronize with the PRAVAHA backend.

==================================================
IMPORTANT TECHNICAL FRAMING
==================================================

Do NOT claim that this implementation is the complete official Bluetooth Mesh specification.

Implement a PRAVAHA-specific peer-to-peer offline relay protocol inspired by mesh/store-and-forward principles.

Bluetooth Mesh itself uses relay nodes, TTL and message caching for multi-hop communication.

Use similar concepts:

- node identity
- message ID
- TTL / hop limit
- message cache
- relay
- acknowledgements
- duplicate prevention
- store-and-forward
- eventual synchronization

The implementation must be reliable enough for the prototype demonstration.

==================================================
TARGET PLATFORM
==================================================

Build the mobile mesh client for ANDROID.

Prefer Flutter if the existing PRAVAHA mobile application architecture is Flutter.

If the current mobile application is not Flutter, create the appropriate Android-compatible implementation without breaking the existing project.

The PRAVAHA web dashboard remains the primary command center.

==================================================
COMMUNICATION TRANSPORT
==================================================

Primary transport:

Bluetooth Low Energy.

Where technically practical and supported, create an abstraction that can later support:

Wi-Fi Direct
Wi-Fi Aware
local-only Wi-Fi

Do not make the entire architecture dependent on one transport.

Create:

TransportManager

with an interface such as:

discoverPeers()
advertise()
connect()
sendMessage()
receiveMessage()
disconnect()
getNearbyNodes()

The first production prototype transport should be BLE.

==================================================
ANDROID PERMISSIONS
==================================================

Correctly implement Android permissions for modern Android versions.

For Android 12+ account for:

BLUETOOTH_SCAN
BLUETOOTH_ADVERTISE
BLUETOOTH_CONNECT

Request runtime permission appropriately.

Do not blindly request unnecessary permissions.

For Wi-Fi-based fallback, account for:

NEARBY_WIFI_DEVICES

where required.

Handle permission denial gracefully.

The application must clearly explain why nearby-device permissions are required.

Do not break the application if permissions are denied.

==================================================
NODE IDENTITY
==================================================

Every PRAVAHA mesh-enabled device should have a unique:

nodeId

Example:

PRV-NODE-A8F31

Store the node ID locally.

Do not use the user's phone number as the node ID.

Each node should have:

nodeId
deviceType
role
lastSeen
capabilities
connectionState

Possible roles:

FIELD_OFFICER
DRIVER
RELAY
SUPERVISOR
GATEWAY

==================================================
MESSAGE FORMAT
==================================================

Create a standardized PRAVAHA offline message.

Example:

{
  "messageId": "PRV-MSG-8F3A91",
  "type": "FIELD_INCIDENT",
  "originNodeId": "PRV-NODE-A8F31",
  "createdAt": "...",
  "ttl": 5,
  "hopCount": 0,
  "priority": "CRITICAL",
  "payload": {
    "incidentType": "LANDSLIDE",
    "severity": "CRITICAL",
    "road": "NH-10",
    "latitude": 27.33,
    "longitude": 88.61,
    "description": "Road blocked by landslide"
  },
  "requiresCloudSync": true
}

Use a compact representation where appropriate.

==================================================
MESSAGE TYPES
==================================================

Support at minimum:

FIELD_INCIDENT

ROAD_BLOCK

ROAD_REOPENED

VEHICLE_STATUS

SHIPMENT_UPDATE

EMERGENCY_ALERT

GPS_UPDATE

SYNC_REQUEST

SYNC_RESPONSE

ACKNOWLEDGEMENT

HEARTBEAT

==================================================
MESSAGE PRIORITY
==================================================

Implement:

CRITICAL
HIGH
NORMAL
LOW

Critical messages should be prioritized for relay and synchronization.

Example:

Landslide:
CRITICAL

Road blockage:
CRITICAL

Vehicle breakdown:
HIGH

Routine GPS:
NORMAL

Analytics telemetry:
LOW

==================================================
TTL / HOP LIMIT
==================================================

Implement TTL/hopLimit.

Example:

ttl = 5

Every relay:

hopCount += 1

ttl decreases.

When TTL reaches zero:

do not relay further.

Do not allow unlimited propagation.

==================================================
MESSAGE CACHE
==================================================

Every node must maintain a local message cache.

When receiving a message:

1. Check messageId.

2. If already processed:
discard duplicate.

3. If new:
store it.

4. Process it.

5. Relay if TTL permits.

6. Acknowledge receipt where appropriate.

This is critical.

Do not allow:

A → B → A → B → A

loops.

==================================================
STORE AND FORWARD
==================================================

If there is no Internet:

Store outgoing messages locally.

Example:

OFFLINE QUEUE

5 messages waiting to sync.

When another peer is discovered:

attempt transfer.

When Internet becomes available:

upload pending messages.

After successful server acknowledgement:

mark:

SYNCED

Do not delete the local record until successful acknowledgement is received.

==================================================
MESSAGE DELIVERY STATE
==================================================

Every offline message should have a state:

CREATED

QUEUED

DISCOVERED

TRANSFERRED

RELAYED

RECEIVED

SYNC_PENDING

SYNCING

SYNCED

FAILED

EXPIRED

Display this state where appropriate.

==================================================
ACKNOWLEDGEMENTS
==================================================

Implement acknowledgements.

Example:

Phone A sends:

MSG-123

Phone B receives:

ACK MSG-123

Phone A displays:

Delivered to nearby PRAVAHA node.

This is important for the demo.

==================================================
NODE DISCOVERY
==================================================

Create a PRAVAHA BLE service.

PRAVAHA devices should advertise a recognizable service identifier.

Example concept:

PRAVAHA_MESH_SERVICE

Do not rely solely on device names.

Use service UUIDs / characteristics appropriately.

Nearby PRAVAHA devices should appear as:

Nearby PRAVAHA Nodes

Example:

PRV-NODE-B82A
Field Officer
Signal: Strong
Status: Available

PRV-NODE-C17F
Vehicle
Signal: Medium
Status: Relay

==================================================
MESH STATUS UI
==================================================

Add a dedicated:

MESH / CONNECTIVITY

section to PRAVAHA.

Display:

Internet:
OFFLINE

Mesh:
AVAILABLE

Nearby Nodes:
3

Pending Messages:
7

Last Sync:
12 minutes ago

Relay Status:
ACTIVE

This should be extremely clear.

==================================================
COMMAND CENTER INTEGRATION
==================================================

Add a connectivity/resilience indicator to Command Center.

Example:

COMMUNICATION STATUS

Internet:
OFFLINE

Local Mesh:
ACTIVE

Nearby PRAVAHA Nodes:
4

Pending Reports:
6

Last Cloud Sync:
09:41

When Internet returns:

Internet:
CONNECTED

Mesh:
ACTIVE

Sync:
COMPLETE

==================================================
FIELDLINK INTEGRATION
==================================================

FieldLink must work without Internet.

A field officer should be able to:

Create incident

Capture GPS

Capture photo

Set severity

Add description

Submit

even when offline.

The incident should immediately appear locally as:

PENDING SYNC

If nearby mesh exists:

MESH RELAY AVAILABLE

Transfer it.

==================================================
DEMO INCIDENT
==================================================

Create a dedicated demo workflow.

On PHONE A:

Disable Internet.

Show:

OFFLINE MODE

Create:

LANDSLIDE

NH-10

CRITICAL

Location:
Current GPS or demo location

Description:

"Major landslide blocking road."

Submit.

Phone A should display:

REPORT STORED LOCALLY

then:

SEARCHING FOR PRAVAHA RELAY...

When Phone B is nearby:

PHONE A:

RELAY FOUND

PRV-NODE-B82A

Sending...

TRANSFER COMPLETE

Phone B:

NEW EMERGENCY MESSAGE

LANDSLIDE

NH-10

CRITICAL

From:
PRV-NODE-A8F31

Then Phone B relays it to Phone C.

==================================================
GATEWAY DEVICE
==================================================

Designate one device as:

INTERNET GATEWAY

This device can have Internet connectivity while other phones do not.

Example:

PHONE A
Offline

↓

PHONE B
Offline relay

↓

PHONE C
Internet gateway

↓

PRAVAHA API

When Phone C receives the message:

automatically upload it to the backend.

Backend response:

SYNC SUCCESSFUL

Then propagate acknowledgement back through the mesh where possible.

==================================================
PRAVAHA WEB DASHBOARD
==================================================

When the gateway synchronizes an incident:

the web dashboard must update.

Example:

ALERTNET

CRITICAL

NH-10 BLOCKED

Source:

PRAVAHA Offline Mesh

Reporter:

PRV-NODE-A8F31

Received:

10:42

Then update:

Command Center

Live Map

Risk Engine

AlertNet

RouteGuard

FleetPulse if affected

SupplyGrid if affected

==================================================
LIVE MAP
==================================================

Display mesh-originated incidents differently from normal online reports.

Example:

🔴 Landslide

Source:
Offline Mesh

Verified:
Pending

When verified:

Verified

Use a small source indicator:

MESH

Do not make it visually distracting.

==================================================
RISK ENGINE
==================================================

When a mesh incident is synchronized:

feed it into Risk Engine.

Example:

NH-10

Previous risk:
42

New field report:
Landslide

Risk:
78

Status:
HIGH

Explain:

"Risk increased due to a field-reported road blockage received through PRAVAHA Offline Mesh."

==================================================
ROUTEGUARD
==================================================

When a mesh-originated road blockage is verified:

mark the affected road segment as:

BLOCKED

RouteGuard must exclude or heavily penalize that segment.

Recalculate alternate routes.

Example:

Original:
Guwahati → Imphal

Road:
BLOCKED

RouteGuard:

Alternative route found.

Show:

Original ETA
New ETA
Delay
Risk difference

==================================================
SECURITY
==================================================

This is an emergency logistics system.

Do not transmit sensitive information in plaintext if avoidable.

Implement a message-signing/encryption abstraction.

At minimum:

message integrity

message ID

source identity

authentication

replay protection

Do not allow arbitrary unknown devices to inject operational incidents into the production system.

For the prototype, create a controlled PRAVAHA network mode.

Only trusted/provisioned nodes should be able to participate in the official mesh.

==================================================
TRUSTED NODE MODEL
==================================================

Support:

Provisioned Node

Unprovisioned Node

Blocked Node

Example:

PRV-NODE-A8F31

Status:
TRUSTED

Unknown device:

Status:
UNTRUSTED

Do not accept operational messages from untrusted devices without explicit approval.

==================================================
DEVICE ROLES
==================================================

Support:

FIELD_OFFICER

DRIVER

RELAY

GATEWAY

ADMIN

A normal user device may be:

FIELD_OFFICER + RELAY

A connected device may be:

GATEWAY + RELAY

==================================================
BATTERY MANAGEMENT
==================================================

Do not continuously scan aggressively.

Use reasonable scan/advertise intervals.

Allow:

Mesh Active

Mesh Low Power

Mesh Off

Do not destroy battery life.

==================================================
CONNECTION RESILIENCE
==================================================

Handle:

device leaving range

device returning

Bluetooth disabled

permission denied

connection failure

message timeout

duplicate message

corrupt message

expired message

no gateway

no peers

Internet returning

server unavailable

==================================================
OFFLINE-FIRST DATABASE
==================================================

Use local persistence.

Flutter:

prefer SQLite/Drift/Isar or another robust local persistence mechanism appropriate to the existing architecture.

Store:

incidents

messages

queue

nodes

acknowledgements

sync status

events

Do not rely only on in-memory variables.

The app should survive restart.

==================================================
SYNC ENGINE
==================================================

Create:

SyncManager

Responsibilities:

queue messages

retry

prioritize

upload

receive acknowledgement

mark synced

handle conflicts

restore after restart

Example:

Pending:
12

Syncing:
3

Synced:
98

Failed:
1

==================================================
CONFLICT HANDLING
==================================================

Do not overwrite newer data with older offline data.

Use:

timestamps

version numbers

event IDs

server timestamps

source timestamps

When conflicts occur:

retain both events where necessary.

Do not silently discard field intelligence.

==================================================
WEB SOCKET / REAL-TIME UPDATE
==================================================

Once the gateway synchronizes an incident, the web dashboard should update without requiring a page refresh.

Use:

WebSocket

SSE

or another appropriate real-time mechanism.

For the prototype, use a simulated real-time provider if backend infrastructure is incomplete.

==================================================
DEMO CONTROL PANEL
==================================================

Add a special developer/demo panel.

Do not expose dangerous controls in normal production navigation.

Allow the demo operator to simulate:

Internet OFF

Internet ON

Bluetooth available

Bluetooth unavailable

Peer discovered

Peer disconnected

Road blocked

Road reopened

Message created

Message relayed

Gateway available

Gateway unavailable

Sync complete

This allows the entire mesh workflow to be demonstrated reliably.

==================================================
JUDGE DEMONSTRATION MODE
==================================================

Create a polished "Offline Resilience Demo".

The demonstration should take approximately 2–3 minutes.

STEP 1

Phone A:

Internet OFF

PRAVAHA shows:

OFFLINE MODE

STEP 2

Field officer creates:

LANDSLIDE

NH-10

CRITICAL

STEP 3

PRAVAHA stores the report locally.

STEP 4

Phone A discovers:

PRV-NODE-B

Mesh Relay

STEP 5

Report transfers.

STEP 6

Phone B displays:

Emergency report received.

STEP 7

Phone B discovers:

PRV-NODE-C

Internet Gateway

STEP 8

Message is relayed.

STEP 9

Phone C synchronizes with PRAVAHA.

STEP 10

Command Center immediately shows:

NH-10 BLOCKED

STEP 11

AlertNet creates:

CRITICAL ROAD BLOCKAGE

STEP 12

Risk Engine increases corridor risk.

STEP 13

RouteGuard detects affected route.

STEP 14

RouteGuard calculates alternate route.

STEP 15

Shipment is rerouted.

STEP 16

Command Center shows:

OFFLINE REPORT → MESH → CLOUD → ALERT → REROUTE

This should be visually impressive but technically truthful.

==================================================
DEMO VISUALIZATION
==================================================

Create a small visualization showing:

PHONE A
    ↓
Bluetooth
    ↓
PHONE B
    ↓
Bluetooth
    ↓
PHONE C
    ↓
Internet
    ↓
PRAVAHA CLOUD

Animate the message travelling through the network.

Show status:

CREATED

↓

STORED

↓

RELAYED

↓

GATEWAY

↓

SYNCED

↓

ACTIONED

Do not use excessive futuristic graphics.

Keep the visual style consistent with PRAVAHA:

light

premium

elegant

professional

teal

white

soft neutral colors

No neon.

No cyberpunk.

No dark blue.

No glowing sci-fi effects.

==================================================
OBSERVABILITY
==================================================

Create a Mesh Diagnostics page.

Show:

Node ID

Role

Connection

RSSI/signal where available

Last Seen

Messages Received

Messages Relayed

Messages Synced

Battery State if available

Queue Size

Errors

This will help debugging during the hackathon.

==================================================
TEST PLAN
==================================================

You must test the real implementation with at least:

2 Android devices

Preferably:

3 Android devices

Test:

A → B

B → C

A → B → C

offline storage

relay

duplicate prevention

TTL

acknowledgement

gateway synchronization

server update

dashboard update

road blockage

route recalculation

Internet restoration

Bluetooth disconnection

device restart

permission denial

empty queue

failed transfer

retry

==================================================
IMPORTANT REAL-WORLD LIMITATIONS
==================================================

Do NOT claim:

"Works anywhere without infrastructure."

Do NOT claim:

"Works through every jammer."

Do NOT claim:

"Unlimited range."

Do NOT claim:

"Every phone automatically becomes a relay."

Correctly communicate:

"PRAVAHA uses locally available peer-to-peer connectivity and store-and-forward communication to maintain operational data exchange when conventional Internet connectivity is unavailable."

The mesh requires participating compatible devices within communication range.

==================================================
PRODUCTION ARCHITECTURE
==================================================

Keep the offline mesh module modular.

Create:

MeshManager

TransportManager

PeerManager

MessageManager

MessageCache

OfflineQueue

SyncManager

SecurityManager

ConnectivityManager

MeshEventBus

Do not mix mesh logic directly into UI widgets.

==================================================
FINAL INTEGRATION
==================================================

Integrate this into the existing PRAVAHA ecosystem.

The complete flow should be:

FIELD OFFICER

↓

FieldLink

↓

Offline Storage

↓

PRAVAHA Mesh

↓

Relay Node

↓

Gateway

↓

PRAVAHA API

↓

Command Center

↓

AlertNet

↓

Risk Engine

↓

RouteGuard

↓

FleetPulse

↓

SupplyGrid

This should become a genuine PRAVAHA capability.

==================================================
FINAL REQUIREMENT
==================================================

Do not just create a mockup of mesh communication.

Build a working Android prototype.

Build the web dashboard integration.

Build local persistence.

Build peer discovery.

Build message transfer.

Build relay.

Build duplicate prevention.

Build TTL.

Build synchronization.

Build acknowledgement.

Build demo controls.

Test it.

Fix the problems.

Then run the complete end-to-end demonstration.

The final judge experience should clearly demonstrate:

"No Internet does NOT mean PRAVAHA stops."

PRAVAHA continues to collect and exchange critical information locally, then synchronizes it when a connected gateway becomes available.

The final message shown during the demonstration should be:

CONNECTIVITY LOST.

PRAVAHA REMAINS OPERATIONAL.

Predict. Navigate. Deliver.