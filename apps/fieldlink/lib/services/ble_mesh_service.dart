import 'dart:async';
import 'package:flutter/services.dart';
import '../models/mesh_node.dart';
import '../models/field_report.dart';
import 'offline_storage.dart';

class BleMeshService {
  static const MethodChannel _channel  = MethodChannel('com.pravaha.fieldlink/ble');
  static const EventChannel  _events   = EventChannel('com.pravaha.fieldlink/ble_packets');

  bool isAdvertising = false;
  bool isScanning    = false;
  List<MeshNode> discoveredPeers = [];

  String? _thisNodeId;
  final StreamController<Map<String, dynamic>> _packetController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get packetStream => _packetController.stream;

  // ── Init Stream ───────────────────────────────────────────────────────
  void initPacketStream() {
    _events.receiveBroadcastStream().listen(
      (dynamic event) async {
        if (event is Map) {
          final map = Map<String, dynamic>.from(event);
          _packetController.add(map);

          // If packet received from peer via BLE Mesh, store in local SQLite database!
          if (map['_direction'] == 'RECEIVED') {
            final String originNode = map['originNodeId'] ?? 'PRV-PEER';
            final String incType    = map['incidentType'] ?? 'INCIDENT';
            final String severity   = map['severity'] ?? 'MODERATE';
            final String location   = map['locationName'] ?? 'Nearby Field';
            final String desc       = map['description'] ?? 'Relayed via BLE mesh';

            final report = FieldReport(
              id: map['messageId'] ?? 'PKT-${DateTime.now().millisecondsSinceEpoch}',
              incidentType: incType,
              severity: severity,
              latitude: 27.1425,
              longitude: 88.4231,
              locationName: location,
              description: desc,
              syncStatus: 'OUTBOX', // Ready to sync when gateway node reaches internet
              createdAt: DateTime.now().toIso8601String(),
              originNodeId: originNode,
            );

            await OfflineStorage.instance.insertReport(report);
          }
        }
      },
      onError: (_) {},
    );
  }

  // ── Node ID ───────────────────────────────────────────────────────────
  Future<String> getThisNodeId() async {
    if (_thisNodeId != null) return _thisNodeId!;
    try {
      final id = await _channel.invokeMethod<String>('getThisNodeId');
      _thisNodeId = id ?? 'PRV-UNKNOWN';
    } on PlatformException {
      _thisNodeId = 'PRV-UNKNOWN';
    }
    return _thisNodeId!;
  }

  // ── BLE Mesh start ────────────────────────────────────────────────────
  Future<void> startBleMesh() async {
    try {
      final bool result = await _channel.invokeMethod('startMeshNode');
      isAdvertising = result;
      isScanning    = result;
      initPacketStream();
    } on PlatformException {
      // BLE fallback
    }
  }

  // ── Peer discovery ────────────────────────────────────────────────────
  Future<List<MeshNode>> getNearbyPeers() async {
    try {
      final List<dynamic>? peersJson =
          await _channel.invokeMethod('getDiscoveredPeers');
      if (peersJson != null) {
        discoveredPeers = peersJson
            .map((p) => MeshNode.fromJson(Map<String, dynamic>.from(p)))
            .toList();
      }
    } on PlatformException {
      // fallback
    }
    return discoveredPeers;
  }

  // ── Received packets (one-shot fetch) ─────────────────────────────────
  Future<List<Map<String, dynamic>>> getReceivedPackets() async {
    try {
      final List<dynamic>? raw =
          await _channel.invokeMethod('getReceivedPackets');
      if (raw != null) {
        return raw.map((p) => Map<String, dynamic>.from(p)).toList();
      }
    } on PlatformException {
      // fallback
    }
    return [];
  }

  // ── Broadcast ─────────────────────────────────────────────────────────
  Future<bool> broadcastIncidentReport(FieldReport report) async {
    final nodeId = await getThisNodeId();
    try {
      final Map<String, dynamic> payload = {
        'messageId':    report.id,
        'originNodeId': nodeId,
        'incidentType': report.incidentType,
        'severity':     report.severity,
        'latitude':     report.latitude,
        'longitude':    report.longitude,
        'locationName': report.locationName,
        'description':  report.description,
        'createdAt':    report.createdAt,
        'ttl':          5,
        'hopCount':     0,
      };

      final bool success =
          await _channel.invokeMethod('broadcastMeshPacket', payload);
      await OfflineStorage.instance.updateReportSyncStatus(report.id, 'OUTBOX');
      return success;
    } on PlatformException {
      await OfflineStorage.instance.updateReportSyncStatus(report.id, 'OUTBOX');
      return false;
    }
  }

  void dispose() {
    _packetController.close();
  }
}
