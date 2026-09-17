# PRAVAHA FieldLink Flutter Mobile Application Documentation

## Overview
PRAVAHA FieldLink (`apps/fieldlink`) is a cross-platform Flutter/Android application built for field officers, relief drivers, and emergency responders operating in remote locations across North East India.

## Key Capabilities
1. **<20 Seconds Rapid Incident Reporting**:
   - Single-tap selection for 8 incident categories: Landslide, Flood, Road Block, Bridge Damage, Heavy Rain, Accident, Vehicle Breakdown, Supply Issue.
   - Automatic GPS location capture and severity level tagging.
2. **Offline-First Storage Engine**:
   - Built with `sqflite` (SQLite) to store session state, incident outbox queues, and route metadata locally without requiring Internet access.
3. **Native Android BLE MethodChannel Bridge**:
   - Interacts with `PravahaBleBridge.kt` for background BLE scanning, advertising, peer discovery, and store-and-forward packet transmission.
4. **Connectivity Diagnostics View**:
   - Live real-time dashboard displaying status for Internet, Bluetooth, Nearby Nodes count, Outbox queue size, and Server Sync state.

## Installation & Running
```bash
cd apps/fieldlink
flutter pub get
flutter run --release
```
