import 'dart:async';
import 'package:flutter/material.dart';
import '../models/field_report.dart';
import '../services/offline_storage.dart';
import '../services/ble_mesh_service.dart';
import '../services/sync_engine.dart';
import 'report_incident_screen.dart';
import 'connectivity_screen.dart';
import 'mesh_monitor_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final BleMeshService _bleService = BleMeshService();
  final SyncEngine _syncEngine = SyncEngine();
  List<FieldReport> reports = [];
  String _thisNodeId = 'Loading...';
  StreamSubscription? _packetSub;
  Timer? _autoSyncTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _bleService.startBleMesh().then((_) {
      _bleService.getThisNodeId().then((id) {
        if (!mounted) return;
        setState(() => _thisNodeId = id);
      });
    });

    // Auto-reload reports when incoming BLE Mesh packet is received
    _packetSub = _bleService.packetStream.listen((_) {
      _loadReports();
    });

    _loadReports();

    // ── Auto Background Sync ──────────────────────────────────────────────
    // Check every 5s if internet is restored. If so, flush OUTBOX reports to cloud portal!
    _autoSyncTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      final synced = await _syncEngine.syncOutbox();
      if (synced > 0 && mounted) {
        _loadReports();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Re-enable BLE advertising & scanning when returning to app
      _bleService.startBleMesh();
      _loadReports();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _packetSub?.cancel();
    _autoSyncTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadReports() async {
    final list = await OfflineStorage.instance.getAllReports();
    if (!mounted) return;
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
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('PRAVAHA FIELDLINK',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: 0.8)),
                Text('Node: $_thisNodeId | Field Officer',
                    style: const TextStyle(fontSize: 10, color: Colors.tealAccent)),
              ],
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            tooltip: 'Mesh Monitor',
            icon: const Icon(Icons.radar, color: Colors.purpleAccent),
            onPressed: () {
              Navigator.push(context,
                  MaterialPageRoute(builder: (_) => MeshMonitorScreen(bleService: _bleService)));
            },
          ),
          IconButton(
            tooltip: 'Connectivity',
            icon: const Icon(Icons.cell_tower, color: Colors.tealAccent),
            onPressed: () {
              Navigator.push(context,
                  MaterialPageRoute(builder: (_) => ConnectivityScreen(bleService: _bleService)));
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Banner ───────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF075E68), Color(0xFF087F8C)]),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('OFFLINE RESILIENCE ACTIVE',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text('BLE Mesh Store & Forward + Auto Sync',
                          style: TextStyle(color: Colors.tealAccent, fontSize: 11)),
                    ],
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF087F8C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () async {
                      await Navigator.push(context,
                          MaterialPageRoute(
                              builder: (_) => ReportIncidentScreen(bleService: _bleService)));
                      if (!mounted) return;
                      _loadReports();
                    },
                    child: const Text('REPORT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // ── Mesh Monitor quick-tap ───────────────────────────────
            GestureDetector(
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => MeshMonitorScreen(bleService: _bleService))),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.purpleAccent.withAlpha(80)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.radar, color: Colors.purpleAccent, size: 28),
                    SizedBox(width: 14),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('BLE MESH MONITOR',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text('Tap to view live packet transmission log',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    ]),
                    Spacer(),
                    Icon(Icons.arrow_forward_ios, color: Color(0xFF475569), size: 14),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('MY RECENT FIELD REPORTS',
                    style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold, fontSize: 12)),
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
                    decoration: BoxDecoration(
                        color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Center(
                      child: Text(
                          'No local field reports yet.\nTap REPORT above to log an incident offline.',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          textAlign: TextAlign.center),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: reports.length,
                    itemBuilder: (_, index) {
                      final r = reports[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: r.severity == 'CRITICAL'
                                ? Colors.red.withAlpha(50)
                                : Colors.amber.withAlpha(50),
                            child: Icon(Icons.warning,
                                color: r.severity == 'CRITICAL' ? Colors.red : Colors.amber,
                                size: 18),
                          ),
                          title: Text('${r.incidentType} on ${r.locationName}',
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text(
                              'Node: ${r.originNodeId} | Status: ${r.syncStatus}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: r.syncStatus == 'SYNCED'
                                  ? Colors.green.withAlpha(50)
                                  : Colors.orange.withAlpha(50),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(r.syncStatus,
                                style: TextStyle(
                                    color: r.syncStatus == 'SYNCED'
                                        ? Colors.greenAccent
                                        : Colors.orangeAccent,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold)),
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
