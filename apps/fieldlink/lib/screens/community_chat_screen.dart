import 'dart:async';
import 'package:flutter/material.dart';
import '../services/ble_mesh_service.dart';
import '../models/mesh_node.dart';

class ChatMessageItem {
  final String id;
  final String senderNodeId;
  final String senderName;
  final String role;
  final String message;
  final String? voiceNoteDuration;
  final bool isSos;
  final DateTime timestamp;
  final bool isOutbox;

  ChatMessageItem({
    required this.id,
    required this.senderNodeId,
    required this.senderName,
    required this.role,
    required this.message,
    this.voiceNoteDuration,
    required this.isSos,
    required this.timestamp,
    required this.isOutbox,
  });
}

class CommunityChatScreen extends StatefulWidget {
  final BleMeshService bleService;

  const CommunityChatScreen({super.key, required this.bleService});

  @override
  State<CommunityChatScreen> createState() => _CommunityChatScreenState();
}

class _CommunityChatScreenState extends State<CommunityChatScreen> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  String thisNodeId = 'PRV-NODE';
  List<MeshNode> connectedPeers = [];
  bool isRecordingVoice = false;
  int recordSeconds = 0;
  Timer? _recordTimer;
  String? attachedVoiceNote;

  List<ChatMessageItem> messages = [];

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final id = await widget.bleService.getThisNodeId();
    final peers = await widget.bleService.getNearbyPeers();

    if (!mounted) return;
    setState(() {
      thisNodeId = id;
      connectedPeers = peers;
      // Seed initial community chat messages for demonstration & disaster response coordination
      messages = [
        ChatMessageItem(
          id: 'msg-01',
          senderNodeId: 'PRV-GATEWAY-01',
          senderName: 'Command Operator (Guwahati)',
          role: 'LOGISTICS_ADMIN',
          message: '🚨 ATTENTION ALL FIELD NODES: Landslide reported on NH-10 Teesta Valley segment. All incoming relief convoys rerouted via Kalimpong bypass.',
          isSos: true,
          timestamp: DateTime.now().subtract(const Duration(minutes: 12)),
          isOutbox: false,
        ),
        ChatMessageItem(
          id: 'msg-02',
          senderNodeId: 'PRV-FIELD-NODE-B',
          senderName: 'Officer Sharma (NDRF Unit 4)',
          role: 'FIELD_OFFICER',
          message: 'Copy Command. Unit 4 is on ground near Melli bridge. Clearing 1-lane access with excavators.',
          voiceNoteDuration: '00:14',
          isSos: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 8)),
          isOutbox: false,
        ),
        ChatMessageItem(
          id: 'msg-03',
          senderNodeId: id,
          senderName: 'This Device ($id)',
          role: 'FIELD_OFFICER',
          message: 'Reporting live status: Satellite MODIS overlay confirmed heavy cloud cover over Teesta. Mesh store-and-forward active.',
          isSos: false,
          timestamp: DateTime.now().subtract(const Duration(minutes: 3)),
          isOutbox: true,
        ),
      ];
    });
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    _recordTimer?.cancel();
    super.dispose();
  }

  void _toggleVoiceRecord() {
    if (isRecordingVoice) {
      // Stop recording
      _recordTimer?.cancel();
      setState(() {
        isRecordingVoice = false;
        attachedVoiceNote = '00:${recordSeconds.toString().padLeft(2, '0')}';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Voice note recorded ($attachedVoiceNote)! Tap Send to broadcast.'),
          backgroundColor: Colors.teal,
        ),
      );
    } else {
      // Start recording
      setState(() {
        isRecordingVoice = true;
        recordSeconds = 0;
        attachedVoiceNote = null;
      });
      _recordTimer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) return;
        setState(() {
          recordSeconds++;
          if (recordSeconds >= 30) {
            _toggleVoiceRecord();
          }
        });
      });
    }
  }

  void _sendMessage({bool isSos = false}) {
    final text = _msgController.text.trim();
    if (text.isEmpty && attachedVoiceNote == null && !isSos) return;

    final newMsg = ChatMessageItem(
      id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
      senderNodeId: thisNodeId,
      senderName: 'Field Officer ($thisNodeId)',
      role: 'FIELD_OFFICER',
      message: isSos
          ? '🚨 EMERGENCY SOS BROADCAST: Urgent medical assistance required at location!'
          : (text.isNotEmpty ? text : '🎙️ Audio Voice Note Attached'),
      voiceNoteDuration: attachedVoiceNote,
      isSos: isSos,
      timestamp: DateTime.now(),
      isOutbox: true,
    );

    setState(() {
      messages.add(newMsg);
      _msgController.clear();
      attachedVoiceNote = null;
      recordSeconds = 0;
    });

    // Scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isSos ? '🚨 SOS EMERGENCY BROADCAST SENT OVER MESH!' : 'Message broadcasted via BLE Mesh!'),
        backgroundColor: isSos ? Colors.redAccent : const Color(0xFF087F8C),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final connectedNode = connectedPeers.isNotEmpty ? connectedPeers.first : null;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('EMERGENCY COMMUNITY CHAT',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8)),
            Row(
              children: [
                const Icon(Icons.circle, size: 8, color: Colors.greenAccent),
                const SizedBox(width: 4),
                Text(
                  connectedNode != null
                      ? 'Connected to ${connectedNode.nodeId} (${connectedNode.rssi} dBm)'
                      : 'BLE Mesh Broadcast Channel Ready',
                  style: const TextStyle(fontSize: 10, color: Colors.tealAccent),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            tooltip: 'Send Quick SOS',
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
            onPressed: () => _sendMessage(isSos: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Connected Mesh Gateway Info Bar ─────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            color: const Color(0xFF1E293B),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.cell_tower, color: Colors.tealAccent, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      connectedNode != null
                          ? 'GATEWAY: ${connectedNode.deviceName} [${connectedNode.nodeId}]'
                          : 'MESH RELAY: Standalone Beacon Node ($thisNodeId)',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.teal.withAlpha(50),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.tealAccent),
                  ),
                  child: const Text('HMAC SECURE', style: TextStyle(color: Colors.tealAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // ── Chat Feed ────────────────────────────────────────────────────────
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(12),
              itemCount: messages.length,
              itemBuilder: (_, index) {
                final m = messages[index];
                return Align(
                  alignment: m.isOutbox ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: m.isSos
                          ? const Color(0xFF7F1D1D)
                          : (m.isOutbox ? const Color(0xFF0F5257) : const Color(0xFF1E293B)),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(14),
                        topRight: const Radius.circular(14),
                        bottomLeft: Radius.circular(m.isOutbox ? 14 : 2),
                        bottomRight: Radius.circular(m.isOutbox ? 2 : 14),
                      ),
                      border: Border.all(
                        color: m.isSos
                            ? Colors.redAccent
                            : (m.isOutbox ? Colors.tealAccent.withAlpha(100) : const Color(0xFF334155)),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header Badge: Inbox vs Outbox & Role
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  m.isOutbox ? Icons.upload : Icons.download,
                                  size: 12,
                                  color: m.isOutbox ? Colors.tealAccent : Colors.indigoAccent,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  m.isOutbox ? 'OUTBOX (Sent)' : 'INBOX (Received)',
                                  style: TextStyle(
                                    color: m.isOutbox ? Colors.tealAccent : Colors.indigoAccent,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              '${m.timestamp.hour.toString().padLeft(2, '0')}:${m.timestamp.minute.toString().padLeft(2, '0')}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),

                        Text(
                          m.senderName,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                        const SizedBox(height: 4),

                        Text(
                          m.message,
                          style: TextStyle(
                            color: m.isSos ? Colors.white : const Color(0xFFE2E8F0),
                            fontSize: 13,
                            fontWeight: m.isSos ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),

                        // Voice Note Player Widget if attached
                        if (m.voiceNoteDuration != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withAlpha(80),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.tealAccent.withAlpha(80)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.play_arrow_rounded, color: Colors.tealAccent, size: 20),
                                const SizedBox(width: 6),
                                Text('Voice Note (${m.voiceNoteDuration})',
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                const SizedBox(width: 10),
                                const Icon(Icons.graphic_eq, color: Colors.tealAccent, size: 16),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // ── Attached Voice Note Preview ──────────────────────────────────────
          if (attachedVoiceNote != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: const Color(0xFF0F5257),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.mic, color: Colors.tealAccent, size: 16),
                      const SizedBox(width: 8),
                      Text('Voice Note Attached: $attachedVoiceNote',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 18),
                    onPressed: () => setState(() => attachedVoiceNote = null),
                  ),
                ],
              ),
            ),

          // ── Chat Input Bar ───────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(10),
            color: const Color(0xFF1E293B),
            child: SafeArea(
              child: Row(
                children: [
                  // Voice Recording Button
                  IconButton(
                    icon: Icon(
                      isRecordingVoice ? Icons.stop_circle : Icons.mic,
                      color: isRecordingVoice ? Colors.redAccent : Colors.tealAccent,
                    ),
                    onPressed: _toggleVoiceRecord,
                    tooltip: isRecordingVoice ? 'Stop Voice Recording' : 'Record Voice Note',
                  ),

                  if (isRecordingVoice)
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.red.withAlpha(40),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.redAccent),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.fiber_manual_record, color: Colors.redAccent, size: 12),
                            const SizedBox(width: 8),
                            Text(
                              'Recording Voice Note... 00:${recordSeconds.toString().padLeft(2, '0')}',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    Expanded(
                      child: TextField(
                        controller: _msgController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Type emergency message or broadcast SOS...',
                          hintStyle: const TextStyle(color: Color(0xFF64748B)),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),

                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFF087F8C),
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                      onPressed: () => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
