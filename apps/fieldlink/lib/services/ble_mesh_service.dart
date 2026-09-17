import 'package:flutter/services.dart';
import '../models/mesh_node.dart';
import '../models/field_report.dart';
import 'offline_storage.dart';

class BleMeshService {
  static const MethodChannel _channel = MethodChannel('com.pravaha.fieldlink/ble');

  bool isAdvertising = false;
  bool isScanning = false;
  List<MeshNode> discoveredPeers = [];

  Future<void> startBleMesh() async {
    try {
      final bool result = await _channel.invokeMethod('startMeshNode');
      isAdvertising = result;
      isScanning = result;
    } on PlatformException catch (e) {
      print("Failed to start native BLE Mesh: ${e.message}");
    }
  }

  Future<List<MeshNode>> getNearbyPeers() async {
    try {
      final List<dynamic>? peersJson = await _channel.invokeMethod('getDiscoveredPeers');
      if (peersJson != null) {
        discoveredPeers = peersJson
            .map((p) => MeshNode.fromJson(Map<String, dynamic>.from(p)))
            .toList();
      }
    } on PlatformException catch (e) {
      print("Failed to fetch nearby BLE peers: ${e.message}");
    }
    return discoveredPeers;
  }

  Future<bool> broadcastIncidentReport(FieldReport report) async {
    try {
      final Map<String, dynamic> payload = {
        'messageId': report.id,
        'originNodeId': report.originNodeId,
        'incidentType': report.incidentType,
        'severity': report.severity,
        'latitude': report.latitude,
        'longitude': report.longitude,
        'locationName': report.locationName,
        'description': report.description,
        'createdAt': report.createdAt,
        'ttl': 5,
        'hopCount': 0,
      };

      final bool success = await _channel.invokeMethod('broadcastMeshPacket', payload);
      
      // Update local storage status
      await OfflineStorage.instance.updateReportSyncStatus(report.id, 'OUTBOX');
      return success;
    } on PlatformException catch (e) {
      print("Error broadcasting BLE mesh packet: ${e.message}");
      return false;
    }
  }
}
