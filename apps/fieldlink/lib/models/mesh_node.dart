class MeshNode {
  final String nodeId;
  final String deviceName;
  final int rssi;
  final String role; // FIELD_OFFICER, RELAY, GATEWAY
  final String status; // ACTIVE, IDLE, DISCONNECTED
  final DateTime lastSeen;

  MeshNode({
    required this.nodeId,
    required this.deviceName,
    required this.rssi,
    required this.role,
    required this.status,
    required this.lastSeen,
  });

  Map<String, dynamic> toJson() {
    return {
      'nodeId': nodeId,
      'deviceName': deviceName,
      'rssi': rssi,
      'role': role,
      'status': status,
      'lastSeen': lastSeen.toIso8601String(),
    };
  }

  factory MeshNode.fromJson(Map<String, dynamic> json) {
    return MeshNode(
      nodeId: json['nodeId'],
      deviceName: json['deviceName'],
      rssi: json['rssi'] ?? -65,
      role: json['role'] ?? 'RELAY',
      status: json['status'] ?? 'ACTIVE',
      lastSeen: DateTime.parse(json['lastSeen']),
    );
  }
}
