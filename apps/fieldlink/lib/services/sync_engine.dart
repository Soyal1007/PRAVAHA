import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/field_report.dart';
import 'offline_storage.dart';

class SyncEngine {
  /// Candidate PRAVAHA API endpoints (local server, Android emulator loopback, Vercel deployment)
  static const List<String> _apiEndpoints = [
    'http://localhost:8000/api/v1',
    'http://10.0.2.2:8000/api/v1',
    'https://pravaha-api.vercel.app/api/v1',
  ];

  Future<bool> hasInternet() async {
    for (final endpoint in _apiEndpoints) {
      try {
        final uri = Uri.parse('$endpoint/incidents');
        final resp = await http.get(uri).timeout(const Duration(seconds: 3));
        if (resp.statusCode == 200) return true;
      } catch (_) {}
    }
    // Fallback socket lookup
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 3));
      return result.isNotEmpty && result.first.rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Sync all LOCAL_ONLY / OUTBOX reports to the PRAVAHA portal.
  Future<int> syncOutbox() async {
    final online = await hasInternet();
    if (!online) return 0;

    final List<FieldReport> unsynced = await OfflineStorage.instance.getUnsyncedReports();
    int syncedCount = 0;

    for (final FieldReport report in unsynced) {
      bool synced = false;
      for (final baseUrl in _apiEndpoints) {
        try {
          // ── 1. Standard incident sync ─────────────────────────────────
          final incidentResp = await http.post(
            Uri.parse('$baseUrl/incidents'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'title': '[BLE MESH] ${report.incidentType} at ${report.locationName}',
              'incident_type': report.incidentType,
              'severity': report.severity,
              'lat': report.latitude,
              'lng': report.longitude,
              'road_name': report.locationName,
              'description': report.description ?? 'Reported via PRAVAHA FieldLink offline mesh.',
              'reported_by_node': report.originNodeId,
              'status': 'VERIFIED',
            }),
          ).timeout(const Duration(seconds: 5));

          if (incidentResp.statusCode == 200 || incidentResp.statusCode == 201) {
            synced = true;
          }

          // ── 2. Mesh gateway sync — shows up as BLE relay in portal ────
          try {
            await http.post(
              Uri.parse('$baseUrl/mesh/sync'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'message_id': report.id,
                'origin_node_id': report.originNodeId,
                'sender_node_id': report.originNodeId,
                'type': 'FIELD_INCIDENT',
                'priority': report.severity,
                'ttl': 5,
                'hop_count': 1,
                'payload': {
                  'incidentType': report.incidentType,
                  'severity': report.severity,
                  'latitude': report.latitude,
                  'longitude': report.longitude,
                  'locationName': report.locationName,
                  'description': report.description,
                  'imagePath': report.imagePath,
                  'createdAt': report.createdAt,
                },
              }),
            ).timeout(const Duration(seconds: 5));
          } catch (_) {}

          if (synced) break; // Successfully pushed to server endpoint
        } catch (_) {
          // Continue to next candidate endpoint
        }
      }

      if (synced) {
        await OfflineStorage.instance.updateReportSyncStatus(report.id, 'SYNCED');
        syncedCount++;
      }
    }
    return syncedCount;
  }
}
