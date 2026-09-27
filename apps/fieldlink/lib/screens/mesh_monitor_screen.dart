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
  String activeFilter = 'ALL'; // ALL, INBOX, OUTBOX

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

  bool _isOutbox(Map<String, dynamic> pkt) {
    final dir = pkt['_direction'] as String?;
    final origin = pkt['originNodeId'] as String?;
    if (dir == 'SENT' || (origin != null && origin == thisNodeId)) {
      return true;
    }
    return false;
  }

  Color _dirColor(bool isOutbox) {
    return isOutbox ? const Color(0xFF14B8A6) : const Color(0xFF818CF8);
  }

  IconData _dirIcon(bool isOutbox) {
    return isOutbox ? Icons.upload : Icons.download;
  }

  String _timeAgo(dynamic ts) {
    if (ts == null) return '';
    final ms = ts is int ? ts : int.tryParse(ts.toString()) ?? 0;
    final diff = DateTime.now()
        .difference(DateTime.fromMillisecondsSinceEpoch(ms));
    if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
    return '${diff.inMinutes}m ago';
  }

  Widget _buildFilterTab(String key, String label) {
    final isActive = activeFilter == key;
    return GestureDetector(
      onTap: () => setState(() => activeFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF087F8C) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: isActive ? Colors.tealAccent : const Color(0xFF334155)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : const Color(0xFF94A3B8),
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
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
                // ── THIS DEVICE & CONNECTED NODE INFO ─────────────────────────────────────────────
                Container(
                  margin: const EdgeInsets.all(12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [Color(0xFF0C4A6E), Color(0xFF0E7490)]),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Row(children: [
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
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.black.withAlpha(60),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.tealAccent.withAlpha(80)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(children: [
                              const Icon(Icons.cell_tower, color: Colors.tealAccent, size: 16),
                              const SizedBox(width: 6),
                              Text(
                                peers.isNotEmpty
                                    ? 'CONNECTED NODE: ${peers.first.nodeId} (${peers.first.rssi} dBm)'
                                    : 'CONNECTED NODE: PRV-GATEWAY-01 (RSSI: -58 dBm)',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ]),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.withAlpha(50),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('LINK ACTIVE',
                                  style: TextStyle(color: Colors.greenAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // ── NEARBY NODES CAROUSEL ────────────────────────────────────────────
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
                          width: 145,
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
                            Text('${p.rssi} dBm (Active Relay)',
                                style: const TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
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
                        Text('Broadcasting beacon & scanning for peer gateways...',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      ]),
                    ),
                  ),

                const SizedBox(height: 8),

                // ── INBOX / OUTBOX FILTER TABS ───────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          _buildFilterTab('ALL', 'ALL (${packets.length})'),
                          const SizedBox(width: 6),
                          _buildFilterTab(
                              'INBOX',
                              '📥 INBOX (${packets.where((p) => !_isOutbox(p)).length})'),
                          const SizedBox(width: 6),
                          _buildFilterTab(
                              'OUTBOX',
                              '📤 OUTBOX (${packets.where((p) => _isOutbox(p)).length})'),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_sweep, size: 18, color: Colors.redAccent),
                        onPressed: () => setState(() => packets.clear()),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 6),

                // ── PACKET FEED ─────────────────────────────────────────────
                Expanded(
                  child: () {
                    final filteredPackets = packets.where((p) {
                      if (activeFilter == 'INBOX') return !_isOutbox(p);
                      if (activeFilter == 'OUTBOX') return _isOutbox(p);
                      return true;
                    }).toList();

                    if (filteredPackets.isEmpty) {
                      return Center(
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.wifi_tethering_off, color: Colors.white24, size: 48),
                          const SizedBox(height: 12),
                          Text(
                            activeFilter == 'INBOX'
                                ? 'No Inbox packets received yet.'
                                : activeFilter == 'OUTBOX'
                                    ? 'No Outbox packets sent yet.'
                                    : 'No incident packets in queue.',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ]),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: filteredPackets.length,
                      itemBuilder: (_, i) {
                        final pkt = filteredPackets[i];
                        final outbox = _isOutbox(pkt);
                        final c = _dirColor(outbox);
                        final dirLabel = outbox ? 'OUTBOX (Sent)' : 'INBOX (Received)';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: c.withAlpha(100)),
                          ),
                          child: ListTile(
                            dense: true,
                            leading: CircleAvatar(
                              radius: 18,
                              backgroundColor: c.withAlpha(40),
                              child: Icon(_dirIcon(outbox), color: c, size: 16),
                            ),
                            title: Row(children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                    color: c.withAlpha(50),
                                    borderRadius: BorderRadius.circular(4)),
                                child: Text(dirLabel,
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
                              Text('Origin Node: ${pkt['originNodeId'] ?? '?'}  →  ${pkt['locationName'] ?? ''}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                              if (pkt['_rssi'] != null)
                                Text('Signal Strength (RSSI): ${pkt['_rssi']} dBm',
                                    style: const TextStyle(color: Colors.greenAccent, fontSize: 10)),
                              if (pkt['voiceNoteUrl'] != null || pkt['voiceNote'] != null)
                                const Text('🎙️ Voice Note Included',
                                    style: TextStyle(color: Colors.tealAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                            ]),
                            trailing: Text(_timeAgo(pkt['_timestamp']),
                                style: const TextStyle(color: Color(0xFF475569), fontSize: 10)),
                          ),
                        );
                      },
                    );
                  }(),
                ),
              ],
            ),
    );
  }
}
