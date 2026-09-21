import 'package:flutter/material.dart';
import '../services/ble_mesh_service.dart';
import '../services/sync_engine.dart';
import '../services/offline_storage.dart';
import '../models/mesh_node.dart';

class ConnectivityScreen extends StatefulWidget {
  final BleMeshService bleService;

  const ConnectivityScreen({super.key, required this.bleService});

  @override
  State<ConnectivityScreen> createState() => _ConnectivityScreenState();
}

class _ConnectivityScreenState extends State<ConnectivityScreen> {
  List<MeshNode> peers = [];
  int unsyncedCount = 0;
  bool isSyncing = false;

  @override
  void initState() {
    super.initState();
    _refreshState();
  }

  Future<void> _refreshState() async {
    final discovered = await widget.bleService.getNearbyPeers();
    final unsynced = await OfflineStorage.instance.getUnsyncedReports();
    if (!mounted) return;
    setState(() {
      peers = discovered;
      unsyncedCount = unsynced.length;
    });
  }

  Future<void> _triggerSync() async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => isSyncing = true);
    final syncEngine = SyncEngine();
    final count = await syncEngine.syncOutbox();
    await _refreshState();
    if (!mounted) return;
    setState(() => isSyncing = false);

    messenger.showSnackBar(
      SnackBar(content: Text('Sync complete! $count reports synced to PRAVAHA cloud.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('PRAVAHA Mesh & Connectivity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            _buildStatusCard('Internet Connection', 'DISCONNECTED (OFFLINE MODE)', Icons.wifi_off, Colors.amber),
            const SizedBox(height: 12),
            _buildStatusCard('Bluetooth Low Energy', 'ACTIVE & ADVERTISING', Icons.bluetooth, Colors.blue),
            const SizedBox(height: 12),
            _buildStatusCard('Store & Forward Queue', '$unsyncedCount PENDING OUTBOX PACKETS', Icons.move_to_inbox, Colors.teal),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('NEARBY MESH PEERS', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold, fontSize: 12)),
                IconButton(icon: const Icon(Icons.refresh, color: Colors.tealAccent), onPressed: _refreshState),
              ],
            ),
            const SizedBox(height: 8),
            peers.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Center(
                      child: Text('Scanning for nearby PRAVAHA BLE nodes (Phone B / Relay)...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: peers.length,
                    itemBuilder: (context, index) {
                      final p = peers[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: const Icon(Icons.phone_android, color: Colors.tealAccent),
                          title: Text(p.deviceName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('Node ID: ${p.nodeId} | Role: ${p.role}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          trailing: Text('${p.rssi} dBm', style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                        ),
                      );
                    },
                  ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF087F8C),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: isSyncing ? null : _triggerSync,
                icon: const Icon(Icons.cloud_upload, color: Colors.white),
                label: Text(isSyncing ? 'SYNCING TO SERVER...' : 'FORCE SERVER / GATEWAY SYNC', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(String title, String status, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          CircleAvatar(backgroundColor: color.withAlpha(50), child: Icon(icon, color: color, size: 20)),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(status, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
