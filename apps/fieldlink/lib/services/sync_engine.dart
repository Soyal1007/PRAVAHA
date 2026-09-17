import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/field_report.dart';
import 'offline_storage.dart';

class SyncEngine {
  final String backendUrl;

  SyncEngine({this.backendUrl = 'https://pravaha-api.vercel.app/api/v1'});

  Future<int> syncOutbox() async {
    final unsynced = await OfflineStorage.instance.getUnsyncedReports();
    int syncedCount = 0;

    for (var report in unsynced) {
      try {
        final response = await http.post(
          Uri.parse('$backendUrl/incidents'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'title': '${report.incidentType} on ${report.locationName}',
            'incident_type': report.incidentType,
            'severity': report.severity,
            'lat': report.latitude,
            'lng': report.longitude,
            'road_name': report.locationName,
            'description': report.description ?? 'Reported via PRAVAHA FieldLink App',
            'reported_by_node': report.originNodeId,
          }),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          await OfflineStorage.instance.updateReportSyncStatus(report.id, 'SYNCED');
          syncedCount++;
        }
      } catch (e) {
        print("Sync engine attempt failed for report ${report.id}: $e");
      }
    }
    return syncedCount;
  }
}
