import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/offline_storage.dart';
import '../services/ble_mesh_service.dart';
import 'report_incident_screen.dart';
import 'connectivity_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final BleMeshService _bleService = BleMeshService();
  List<FieldReport> reports = [];

  @override
  void initState() {
    super.initState();
    _bleService.startBleMesh();
    _loadReports();
  }

  Future<void> _loadReports() async {
    final list = await OfflineStorage.instance.getAllReports();
    setState(() => reports = list);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFF087F8C), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.hub, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('PRAVAHA FIELDLINK', style: TextStyle(fontWeight: FontWeight.black, fontSize: 15, letterSpacing: 0.8)),
                Text('Node ID: PRV-FLD-8921 | Field Officer', style: TextStyle(fontSize: 10, color: Colors.tealAccent)),
              ],
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            icon: const Icon(Icons.cell_tower, color: Colors.tealAccent),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => ConnectivityScreen(bleService: _bleService)),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF075E68), Color(0xFF087F8C)],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('OFFLINE RESILIENCE ACTIVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text('BLE Mesh Store & Forward Ready', style: TextStyle(color: Colors.tealAccent, fontSize: 11)),
                    ],
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF087F8C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => ReportIncidentScreen(bleService: _bleService)),
                      );
                      _loadReports();
                    },
                    child: const Text('REPORT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('MY RECENT FIELD REPORTS', style: TextStyle(color: Colors.slate400, fontWeight: FontWeight.bold, fontSize: 12)),
                TextButton.icon(
                  icon: const Icon(Icons.refresh, size: 14, color: Colors.tealAccent),
                  label: const Text('Refresh', style: TextStyle(color: Colors.tealAccent, fontSize: 12)),
                  onPressed: _loadReports,
                ),
              ],
            ),
            const SizedBox(height: 8),
            reports.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(30),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Center(
                      child: Text('No local field reports yet. Tap REPORT above to log an incident offline.', style: TextStyle(color: Colors.slate400, fontSize: 12), textAlign: TextAlign.center),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: reports.length,
                    itemBuilder: (context, index) {
                      final r = reports[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.slate800),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: r.severity == 'CRITICAL' ? Colors.red.withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                            child: Icon(Icons.warning, color: r.severity == 'CRITICAL' ? Colors.red : Colors.amber, size: 18),
                          ),
                          title: Text('${r.incidentType} on ${r.locationName}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Status: ${r.syncStatus} | Created: ${r.createdAt.substring(11, 16)}', style: const TextStyle(color: Colors.slate400, fontSize: 11)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: r.syncStatus == 'SYNCED' ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              r.syncStatus,
                              style: TextStyle(
                                color: r.syncStatus == 'SYNCED' ? Colors.greenAccent : Colors.orangeAccent,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
