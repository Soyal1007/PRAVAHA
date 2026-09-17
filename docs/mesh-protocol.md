# PRAVAHA BLE Mesh Protocol & Store-and-Forward Routing Specification

## Overview
When conventional cellular and Internet networks fail during natural disasters in the North Eastern Region, PRAVAHA nodes switch to a peer-to-peer (P2P) radio network using Bluetooth Low Energy (BLE) and WebRTC DataChannels.

## Message Envelope Structure
Every packet transmitted across the mesh network follows a structured binary/JSON envelope:

```json
{
  "messageId": "INC-1726569600000-A7F2",
  "originNodeId": "PRV-FLD-8921",
  "senderNodeId": "PRV-RELAY-02",
  "type": "FIELD_INCIDENT",
  "priority": "CRITICAL",
  "createdAt": "2026-09-17T08:30:00Z",
  "ttl": 5,
  "hopCount": 2,
  "requiresAck": true,
  "payload": {
    "incidentType": "LANDSLIDE",
    "severity": "CRITICAL",
    "latitude": 27.1425,
    "longitude": 88.4231,
    "locationName": "NH-10 Teesta Valley Corridor",
    "description": "Debris blockage spanning 50m road segment."
  },
  "signature": "hmac_sha256_hash_here"
}
```

## Routing Rules
1. **Hop Limit & TTL**: Default TTL = 5. Each forwarding node increments `hopCount` by 1 and decrements `ttl` by 1. When `ttl <= 0`, the packet is dropped to prevent infinite loops.
2. **De-duplication Cache**: Each node maintains an in-memory & persistent hash table of recently seen `messageId` values. Duplicate packets are rejected immediately.
3. **Store-and-Forward Queue**: Packets are saved to SQLite (`field_reports` table in FieldLink) or IndexedDB (`PRAVAHA_MESH_DB` in Web) so messages survive battery depletion or reboots.
4. **Gateway Synchronization**: When any relay node connects to cellular data, Wi-Fi, or satellite uplink, it pushes pending store-and-forward packets to `/api/v1/mesh/sync`.
