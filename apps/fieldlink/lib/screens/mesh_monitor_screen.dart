import 'dart:async';
import 'package:flutter/material.dart';
import '../services/ble_mesh_service.dart';
import '../models/mesh_node.dart';

class MeshMonitorScreen extends StatefulWidget {
  final BleMeshService bleService;
  const MeshMonitorScreen({super.key, required this.bleService});

  @override
  State<MeshMonitorScreen> createState() => _MeshMonitorScreenState();
}

class _MeshMonitorScreenState extends State<MeshMonitorScreen> {
  List<Map<String, dynamic>> packets = [];
  List<MeshNode> peers = [];
  String thisNodeId = 'PRV-NODE';
  StreamSubscription<Map<String, dynamic>>? _sub;
  Timer? _peerRefresh;
  bool meshActive = true;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final results = await Future.wait([
        widget.bleService.getThisNodeId().timeout(const Duration(seconds: 2)),
        widget.bleService.getReceivedPackets().timeout(const Duration(seconds: 2)),
        widget.bleService.getNearbyPeers().timeout(const Duration(seconds: 2)),
      ]);

      if (!mounted) return;
      setState(() {
        thisNodeId = results[0] as String;
        packets = results[1] as List<Map<String, dynamic>>;
        peers = results[2] as List<MeshNode>;
        meshActive = true;
        isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        isLoading = false;
      });
    }

    // Listen to live packet stream
    _sub = widget.bleService.packetStream.listen((pkt) {
      if (!mounted) return;
      setState(() {
        // Avoid UI duplicates
        final existingIdx = packets.indexWhere((p) =>
            p['originNodeId'] == pkt['originNodeId'] &&
            p['incidentType'] == pkt['incidentType'] &&
            p['locationName'] == pkt['locationName']);
        if (existingIdx >= 0) {
          packets[existingIdx] = pkt;
        } else {
          packets.insert(0, pkt);
        }
      });
    });

    // Periodically refresh peer list
    _peerRefresh = Timer.periodic(const Duration(seconds: 4), (_) async {
      try {
        final fresh = await widget.bleService.getNearbyPeers();
        if (!mounted) return;
        setState(() => peers = fresh);
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _peerRefresh?.cancel();
    super.dispose();
  }

  Color _dirColor(String? dir) {
    if (dir == 'SENT') return const Color(0xFF14B8A6);
    return const Color(0xFF818CF8);
  }

  IconData _dirIcon(String? dir) {
    if (dir == 'SENT') return Icons.upload;
    return Icons.download;
  }

  String _timeAgo(dynamic ts) {
    if (ts == null) return '';
    final ms = ts is int ? ts : int.tryParse(ts.toString()) ?? 0;
    final diff = DateTime.now()
        .difference(DateTime.fromMillisecondsSinceEpoch(ms));
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    return '${diff.inMinutes}m ago';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('BLE MESH MONITOR',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: 1)),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: meshActive ? Colors.green.withAlpha(40) : Colors.red.withAlpha(40),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: meshActive ? Colors.greenAccent : Colors.redAccent),
            ),
            child: Row(children: [
              Icon(Icons.circle,
                  size: 8, color: meshActive ? Colors.greenAccent : Colors.redAccent),
              const SizedBox(width: 5),
              Text(meshActive ? 'LIVE' : 'OFF',
                  style: TextStyle(
                      color: meshActive ? Colors.greenAccent : Colors.redAccent,
                      fontSize: 11,
                      fontWeight: FontWeight.bold)),
            ]),
          ),
        ],
      ),
      body: isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Colors.tealAccent),
                  SizedBox(height: 12),
                  Text('Connecting to BLE Mesh Bridge...',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                ],
              ),
            )
          : Column(
              children: [
                // ── THIS DEVICE ─────────────────────────────────────────────
                Container(
                  margin: const EdgeInsets.all(12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [Color(0xFF0C4A6E), Color(0xFF0E7490)]),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(children: [
                    const Icon(Icons.phone_android, color: Colors.white, size: 28),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('THIS DEVICE NODE ID',
                          style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                      Text(thisNodeId,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1.2)),
                      const Text('Active on BLE Service: 0000FA00',
                          style: TextStyle(color: Colors.tealAccent, fontSize: 10)),
                    ]),
                  ]),
                ),

                // ── NEARBY NODES ────────────────────────────────────────────
                if (peers.isNotEmpty)
                  SizedBox(
                    height: 90,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: peers.length,
                      itemBuilder: (_, i) {
                        final p = peers[i];
                        return Container(
                          width: 130,
                          margin: const EdgeInsets.only(right: 10),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF14B8A6).withAlpha(120)),
                          ),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              const Icon(Icons.hub, color: Colors.tealAccent, size: 14),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(p.nodeId,
                                    style: const TextStyle(
                                        color: Colors.tealAccent,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11),
                                    overflow: TextOverflow.ellipsis),
                              ),
                            ]),
                            const SizedBox(height: 4),
                            Text(p.deviceName,
                                style: const TextStyle(color: Colors.white70, fontSize: 10),
                                overflow: TextOverflow.ellipsis),
                            Text('${p.rssi} dBm',
                                style: const TextStyle(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                          ]),
                        );
                      },
                    ),
                  ),

                if (peers.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(10)),
                      child: const Row(children: [
                        Icon(Icons.radar, color: Colors.tealAccent, size: 16),
                        SizedBox(width: 10),
                        Text('Broadcasting beacon & scanning nearby...',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      ]),
                    ),
                  ),

                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('MESH PACKET LOG (${packets.length})',
                          style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontWeight: FontWeight.bold,
                              fontSize: 12)),
                      TextButton.icon(
                        icon: const Icon(Icons.delete_sweep, size: 14, color: Colors.redAccent),
                        label: const Text('Clear Log', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                        onPressed: () => setState(() => packets.clear()),
                      ),
                    ],
                  ),
                ),

                // ── PACKET FEED ─────────────────────────────────────────────
                Expanded(
                  child: packets.isEmpty
                      ? Center(
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            const Icon(Icons.wifi_tethering_off, color: Colors.white24, size: 48),
                            const SizedBox(height: 12),
                            const Text('No incident packets yet.',
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            const Text('Broadcast an incident report from the home screen.',
                                style: TextStyle(color: Color(0xFF475569), fontSize: 11),
                                textAlign: TextAlign.center),
                          ]),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: packets.length,
                          itemBuilder: (_, i) {
                            final pkt = packets[i];
                            final dir = pkt['_direction'] as String?;
                            final c = _dirColor(dir);
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: c.withAlpha(80)),
                              ),
                              child: ListTile(
                                dense: true,
                                leading: CircleAvatar(
                                  radius: 18,
                                  backgroundColor: c.withAlpha(40),
                                  child: Icon(_dirIcon(dir), color: c, size: 16),
                                ),
                                title: Row(children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                        color: (dir == 'SENT' ? Colors.teal : Colors.indigo).withAlpha(50),
                                        borderRadius: BorderRadius.circular(4)),
                                    child: Text(dir ?? 'RX',
                                        style: TextStyle(color: c, fontWeight: FontWeight.bold, fontSize: 10)),
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      pkt['incidentType'] as String? ?? pkt['messageId'] as String? ?? 'Packet',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ]),
                                subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text('Origin: ${pkt['originNodeId'] ?? '?'}  →  ${pkt['locationName'] ?? ''}',
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                  if (pkt['_rssi'] != null)
                                    Text('Signal Strength (RSSI): ${pkt['_rssi']} dBm',
                                        style: const TextStyle(color: Colors.greenAccent, fontSize: 10)),
                                ]),
                                trailing: Text(_timeAgo(pkt['_timestamp']),
                                    style: const TextStyle(color: Color(0xFF475569), fontSize: 10)),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}
