import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/field_report.dart';
import 'offline_storage.dart';

class SyncEngine {
  /// Main PRAVAHA API — uses Vercel deployment
  static const String _baseUrl = 'https://pravaha-api.vercel.app/api/v1';

  Future<bool> hasInternet() async {
    try {
      final result = await InternetAddress.lookup('pravaha-api.vercel.app')
          .timeout(const Duration(seconds: 5));
      return result.isNotEmpty && result.first.rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Sync all LOCAL_ONLY / OUTBOX reports to the PRAVAHA portal.
  /// Works in two modes:
  ///   - If internet available: POST to /incidents (normal REST route)
  ///   - Also POST to /mesh/sync so portal shows origin as BLE mesh node
  Future<int> syncOutbox() async {
    final online = await hasInternet();
    if (!online) return 0;

    final List<FieldReport> unsynced = await OfflineStorage.instance.getUnsyncedReports();
    int syncedCount = 0;

    for (final FieldReport report in unsynced) {
      try {
        // ── 1. Standard incident sync ─────────────────────────────────
        final incidentResp = await http.post(
          Uri.parse('$_baseUrl/incidents'),
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
        ).timeout(const Duration(seconds: 10));

        bool success = (incidentResp.statusCode == 200 || incidentResp.statusCode == 201);

        // ── 2. Mesh gateway sync — shows up as BLE relay in portal ────
        try {
          await http.post(
            Uri.parse('$_baseUrl/mesh/sync'),
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
          ).timeout(const Duration(seconds: 10));
        } catch (_) {
          // Mesh sync is best-effort
        }

        if (success) {
          await OfflineStorage.instance.updateReportSyncStatus(report.id, 'SYNCED');
          syncedCount++;
        }
      } catch (e) {
        // Offline or network error — keep in local queue for next sync attempt
      }
    }
    return syncedCount;
  }
}
