import 'package:flutter_test/flutter_test.dart';
import 'package:pravaha_fieldlink/models/field_report.dart';

void main() {
  test('FieldReport model serialization and JSON conversion', () {
    final report = FieldReport(
      id: 'INC-101',
      incidentType: 'LANDSLIDE',
      severity: 'CRITICAL',
      latitude: 27.1425,
      longitude: 88.4231,
      locationName: 'NH-10 Teesta Corridor',
      syncStatus: 'LOCAL_ONLY',
      createdAt: '2026-09-17T10:00:00Z',
      originNodeId: 'PRV-FLD-8921',
    );

    expect(report.id, 'INC-101');
    expect(report.incidentType, 'LANDSLIDE');
    expect(report.severity, 'CRITICAL');

    final map = report.toMap();
    expect(map['locationName'], 'NH-10 Teesta Corridor');

    final reconstructed = FieldReport.fromMap(map);
    expect(reconstructed.id, 'INC-101');
    expect(reconstructed.originNodeId, 'PRV-FLD-8921');
  });
}
