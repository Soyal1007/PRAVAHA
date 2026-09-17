import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/offline_storage.dart';
import '../services/ble_mesh_service.dart';

class ReportIncidentScreen extends StatefulWidget {
  final BleMeshService bleService;

  const ReportIncidentScreen({Key? key, required this.bleService}) : super(key: key);

  @override
  _ReportIncidentScreenState createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  String selectedType = 'LANDSLIDE';
  String selectedSeverity = 'CRITICAL';
  final TextEditingController _locationController = TextEditingController(text: 'NH-10 Teesta Valley Segment');
  final TextEditingController _descController = TextEditingController();
  bool isSubmitting = false;

  final List<Map<String, dynamic>> incidentTypes = [
    {'type': 'LANDSLIDE', 'label': 'Landslide', 'icon': Icons.terrain, 'color': Colors.amber},
    {'type': 'FLOOD', 'label': 'Flood', 'icon': Icons.water, 'color': Colors.blue},
    {'type': 'ROAD_BLOCK', 'label': 'Road Block', 'icon': Icons.block, 'color': Colors.orange},
    {'type': 'BRIDGE_DAMAGE', 'label': 'Bridge Damage', 'icon': Icons.architecture, 'color': Colors.purple},
    {'type': 'HEAVY_RAIN', 'label': 'Heavy Rain', 'icon': Icons.cloud_download, 'color': Colors.cyan},
    {'type': 'ACCIDENT', 'label': 'Accident', 'icon': Icons.car_crash, 'color': Colors.red},
    {'type': 'BREAKDOWN', 'label': 'Breakdown', 'icon': Icons.build, 'color': Colors.brown},
    {'type': 'SUPPLY_ISSUE', 'label': 'Supply Issue', 'icon': Icons.local_shipping, 'color': Colors.teal},
  ];

  Future<void> _submitReport() async {
    setState(() => isSubmitting = true);
    
    final String reportId = 'INC-${DateTime.now().millisecondsSinceEpoch}';
    final report = FieldReport(
      id: reportId,
      incidentType: selectedType,
      severity: selectedSeverity,
      latitude: 27.1425, // Mock / GPS coordinate
      longitude: 88.4231,
      locationName: _locationController.text,
      description: _descController.text.isNotEmpty ? _descController.text : 'Disruption reported from field.',
      syncStatus: 'LOCAL_ONLY',
      createdAt: DateTime.now().toIso8601String(),
      originNodeId: 'PRV-FLD-8921',
    );

    // 1. Save to persistent offline database
    await OfflineStorage.instance.insertReport(report);

    // 2. Broadcast via BLE Mesh protocol
    await widget.bleService.broadcastIncidentReport(report);

    setState(() => isSubmitting = false);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Report saved to local storage & broadcasted via BLE Mesh!'),
        backgroundColor: Color(0xFF087F8C),
      ),
    );

    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Rapid Incident Report (<20s)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('1. SELECT INCIDENT TYPE', style: TextStyle(color: Colors.slate300, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 2.5,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: incidentTypes.length,
              itemBuilder: (context, index) {
                final item = incidentTypes[index];
                final isSelected = selectedType == item['type'];
                return InkWell(
                  onTap: () => setState(() => selectedType = item['type']),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF087F8C) : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? Colors.tealAccent : Colors.slate700,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(item['icon'], color: item['color'], size: 20),
                        const SizedBox(width: 8),
                        Text(
                          item['label'],
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),
            const Text('2. SEVERITY LEVEL', style: TextStyle(color: Colors.slate300, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Row(
              children: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((sev) {
                final isSel = selectedSeverity == sev;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isSel ? (sev == 'CRITICAL' ? Colors.red : Colors.orange) : const Color(0xFF1E293B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => setState(() => selectedSeverity = sev),
                      child: Text(sev, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            const Text('3. LOCATION / ROAD NAME', style: TextStyle(color: Colors.slate300, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _locationController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                prefixIcon: const Icon(Icons.location_on, color: Colors.redAccent),
              ),
            ),
            const SizedBox(height: 20),
            const Text('4. FIELD NOTES (OPTIONAL)', style: TextStyle(color: Colors.slate300, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _descController,
              maxLines: 2,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'e.g. 50m road segment blocked by debris flow...',
                hintStyle: const TextStyle(color: Colors.slate500),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF087F8C),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: isSubmitting ? null : _submitReport,
                icon: const Icon(Icons.send_rounded, color: Colors.white),
                label: Text(
                  isSubmitting ? 'BROADCASTING MESH...' : 'SUBMIT & BROADCAST REPORT',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
