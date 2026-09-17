class FieldReport {
  final String id;
  final String incidentType; // LANDSLIDE, FLOOD, ROAD_BLOCK, BRIDGE_DAMAGE, HEAVY_RAIN, ACCIDENT, BREAKDOWN, SUPPLY_ISSUE
  final String severity; // CRITICAL, HIGH, MODERATE, LOW
  final double latitude;
  final double longitude;
  final String locationName;
  final String? description;
  final String syncStatus; // LOCAL_ONLY, OUTBOX, SYNCED
  final String createdAt;
  final String originNodeId;

  FieldReport({
    required this.id,
    required this.incidentType,
    required this.severity,
    required this.latitude,
    required this.longitude,
    required this.locationName,
    this.description,
    required this.syncStatus,
    required this.createdAt,
    required this.originNodeId,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'incidentType': incidentType,
      'severity': severity,
      'latitude': latitude,
      'longitude': longitude,
      'locationName': locationName,
      'description': description,
      'syncStatus': syncStatus,
      'createdAt': createdAt,
      'originNodeId': originNodeId,
    };
  }

  factory FieldReport.fromMap(Map<String, dynamic> map) {
    return FieldReport(
      id: map['id'],
      incidentType: map['incidentType'],
      severity: map['severity'],
      latitude: map['latitude'] is int ? (map['latitude'] as int).toDouble() : map['latitude'],
      longitude: map['longitude'] is int ? (map['longitude'] as int).toDouble() : map['longitude'],
      locationName: map['locationName'],
      description: map['description'],
      syncStatus: map['syncStatus'],
      createdAt: map['createdAt'],
      originNodeId: map['originNodeId'],
    );
  }
}
