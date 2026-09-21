import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/field_report.dart';
import '../services/offline_storage.dart';
import '../services/ble_mesh_service.dart';

class ReportIncidentScreen extends StatefulWidget {
  final BleMeshService bleService;

  const ReportIncidentScreen({super.key, required this.bleService});

  @override
  State<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  String selectedType = 'LANDSLIDE';
  String selectedSeverity = 'CRITICAL';
  final TextEditingController _locationController = TextEditingController(text: 'NH-10 Teesta Valley Segment');
  final TextEditingController _descController = TextEditingController();
  
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();
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

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );
      if (picked != null) {
        setState(() => _selectedImage = File(picked.path));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not attach image: $e')),
      );
    }
  }

  void _showImagePickerModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.tealAccent),
              title: const Text('Take Photo with Camera', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.purpleAccent),
              title: const Text('Choose from Gallery', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitReport() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    setState(() => isSubmitting = true);
    
    final thisNodeId = await widget.bleService.getThisNodeId();
    final String reportId = 'INC-${DateTime.now().millisecondsSinceEpoch}';
    final report = FieldReport(
      id: reportId,
      incidentType: selectedType,
      severity: selectedSeverity,
      latitude: 27.1425,
      longitude: 88.4231,
      locationName: _locationController.text.isNotEmpty ? _locationController.text : 'NH-10 Segment',
      description: _descController.text.isNotEmpty ? _descController.text : 'Disruption reported from field.',
      imagePath: _selectedImage?.path,
      syncStatus: 'LOCAL_ONLY',
      createdAt: DateTime.now().toIso8601String(),
      originNodeId: thisNodeId,
    );

    await OfflineStorage.instance.insertReport(report);
    await widget.bleService.broadcastIncidentReport(report);

    if (!mounted) return;

    setState(() => isSubmitting = false);

    messenger.showSnackBar(
      const SnackBar(
        content: Text('Report saved offline & broadcasted via BLE Mesh!'),
        backgroundColor: Color(0xFF087F8C),
      ),
    );

    navigator.pop();
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
            const Text('1. SELECT INCIDENT TYPE', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.bold)),
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
                        color: isSelected ? Colors.tealAccent : const Color(0xFF334155),
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
            const Text('2. SEVERITY LEVEL', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.bold)),
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
            const Text('3. LOCATION / ROAD NAME', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.bold)),
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
            const Text('4. ATTACH PHOTO EVIDENCE (OPTIONAL)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _selectedImage == null
                ? InkWell(
                    onTap: _showImagePickerModal,
                    child: Container(
                      height: 80,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo, color: Colors.tealAccent, size: 24),
                          SizedBox(width: 10),
                          Text('Tap to Capture / Attach Photo', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  )
                : Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_selectedImage!, height: 160, width: double.infinity, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: CircleAvatar(
                          backgroundColor: Colors.black.withAlpha(180),
                          radius: 16,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: const Icon(Icons.close, color: Colors.white, size: 18),
                            onPressed: () => setState(() => _selectedImage = null),
                          ),
                        ),
                      ),
                    ],
                  ),
            const SizedBox(height: 20),
            const Text('5. FIELD NOTES (OPTIONAL)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _descController,
              maxLines: 2,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'e.g. 50m road segment blocked by debris flow...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
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
