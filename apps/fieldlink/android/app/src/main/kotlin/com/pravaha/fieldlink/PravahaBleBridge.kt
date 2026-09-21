package com.pravaha.fieldlink

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.UUID
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap

class PravahaBleBridge(private val context: Context) :
    MethodChannel.MethodCallHandler,
    EventChannel.StreamHandler {

    companion object {
        private const val TAG = "PravahaBleBridge"
        val SERVICE_UUID: UUID = UUID.fromString("0000FA00-0000-1000-8000-00805F9B34FB")
        const val MANUFACTURER_ID = 0x00E0
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var bleScanner: BluetoothLeScanner? = null

    // Thread-safe collections
    private val discoveredNodes = ArrayList<Map<String, Any>>()
    private val receivedPackets = ArrayList<Map<String, Any>>()
    private val processedPacketMap = ConcurrentHashMap<String, Long>()

    private var eventSink: EventChannel.EventSink? = null
    private var lastBroadcastType = "BEACON"
    private var lastBroadcastSev = "INFO"
    private var lastBroadcastLoc = "PRAVAHA Node"

    init {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        bleAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
        bleScanner = bluetoothAdapter?.bluetoothLeScanner
    }

    private fun getOrCreateNodeId(): String {
        val prefs = context.getSharedPreferences("pravaha_ble_prefs", Context.MODE_PRIVATE)
        var nodeId = prefs.getString("node_id", null)
        if (nodeId == null) {
            val randomHex = (1000..9999).random().toString(16).uppercase()
            nodeId = "PRV-FLD-$randomHex"
            prefs.edit().putString("node_id", nodeId).apply()
        }
        return nodeId
    }

    // ---------- EventChannel ----------
    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }

    // ---------- MethodChannel ----------
    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "startMeshNode" -> {
                val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
                bluetoothAdapter = manager?.adapter
                bleAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
                bleScanner = bluetoothAdapter?.bluetoothLeScanner

                val node = getOrCreateNodeId()
                startAdvertising(node, lastBroadcastType, lastBroadcastSev, lastBroadcastLoc)
                startScanning()
                result.success(true)
            }
            "getDiscoveredPeers" -> {
                synchronized(discoveredNodes) {
                    result.success(ArrayList(discoveredNodes))
                }
            }
            "getReceivedPackets" -> {
                synchronized(receivedPackets) {
                    result.success(ArrayList(receivedPackets))
                }
            }
            "getThisNodeId" -> {
                result.success(getOrCreateNodeId())
            }
            "broadcastMeshPacket" -> {
                val payload = call.arguments as? Map<String, Any>
                if (payload != null) {
                    val node = getOrCreateNodeId()
                    val type = payload["incidentType"] as? String ?: "INCIDENT"
                    val sev  = payload["severity"] as? String ?: "HIGH"
                    val loc  = payload["locationName"] as? String ?: "Field Site"

                    lastBroadcastType = type
                    lastBroadcastSev = sev
                    lastBroadcastLoc = loc

                    val outgoing = payload.toMutableMap()
                    outgoing["originNodeId"] = node
                    outgoing["_direction"] = "SENT"
                    outgoing["_timestamp"] = System.currentTimeMillis()

                    synchronized(receivedPackets) {
                        receivedPackets.add(0, outgoing)
                        if (receivedPackets.size > 50) receivedPackets.removeAt(receivedPackets.size - 1)
                    }
                    eventSink?.success(outgoing)

                    startAdvertising(node, type, sev, loc)
                    result.success(true)
                } else {
                    result.error("INVALID_PAYLOAD", "Payload cannot be null", null)
                }
            }
            else -> result.notImplemented()
        }
    }

    private fun startAdvertising(nodeId: String, incidentType: String, severity: String, location: String) {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        bleAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser

        if (bleAdvertiser == null) return

        try {
            bleAdvertiser?.stopAdvertising(advertiseCallback)
        } catch (ignored: Exception) {}

        try {
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0)
                .build()

            val advertiseData = AdvertiseData.Builder()
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .setIncludeTxPowerLevel(false)
                .build()

            val shortNode = nodeId.replace("PRV-FLD-", "")
            val rawData = "$shortNode|$incidentType|$severity|$location"
            val bytes = rawData.toByteArray(StandardCharsets.UTF_8).take(26).toByteArray()

            val scanResponseData = AdvertiseData.Builder()
                .addManufacturerData(MANUFACTURER_ID, bytes)
                .build()

            bleAdvertiser?.startAdvertising(settings, advertiseData, scanResponseData, advertiseCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Failed startAdvertising: ${e.message}")
        }
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {}
        override fun onStartFailure(errorCode: Int) {}
    }

    private fun startScanning() {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        bleScanner = bluetoothAdapter?.bluetoothLeScanner

        if (bleScanner == null) return

        try {
            bleScanner?.stopScan(scanCallback)
        } catch (ignored: Exception) {}

        try {
            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
                .setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
                .setReportDelay(0)
                .build()

            val filter = ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()

            bleScanner?.startScan(listOf(filter), settings, scanCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Failed startScanning: ${e.message}")
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            if (result == null) return
            val record = result.scanRecord ?: return
            val mData = record.getManufacturerSpecificData(MANUFACTURER_ID)

            var peerNodeId = "PRV-FLD-PEER"
            var incidentType = "BEACON"
            var severity = "INFO"
            var locationName = "Nearby Node"

            if (mData != null && mData.isNotEmpty()) {
                try {
                    val str = String(mData, StandardCharsets.UTF_8)
                    val parts = str.split("|")
                    if (parts.isNotEmpty() && parts[0].isNotBlank()) peerNodeId = "PRV-FLD-${parts[0]}"
                    if (parts.size > 1) incidentType = parts[1]
                    if (parts.size > 2) severity = parts[2]
                    if (parts.size > 3) locationName = parts[3]
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing payload: ${e.message}")
                }
            } else {
                val mac = result.device?.address ?: "PEER"
                peerNodeId = "PRV-FLD-${mac.takeLast(4).replace(":", "")}"
            }

            val myId = getOrCreateNodeId()
            if (peerNodeId == myId) return // Skip self

            val deviceName = result.device?.name?.takeIf { it.isNotBlank() } ?: peerNodeId

            val node = mapOf(
                "nodeId" to peerNodeId,
                "deviceName" to deviceName,
                "rssi" to result.rssi,
                "role" to "RELAY",
                "status" to "ACTIVE",
                "lastSeen" to System.currentTimeMillis().toString()
            )

            synchronized(discoveredNodes) {
                val existingIdx = discoveredNodes.indexOfFirst { it["nodeId"] == peerNodeId }
                if (existingIdx >= 0) {
                    discoveredNodes[existingIdx] = node
                } else {
                    discoveredNodes.add(0, node)
                }
            }

            if (incidentType == "BEACON" || incidentType == "BLE MESH") {
                return
            }

            val packetKey = "$peerNodeId:$incidentType:$locationName"
            val lastSeenTime = processedPacketMap[packetKey] ?: 0L
            val now = System.currentTimeMillis()

            if (now - lastSeenTime < 600000L) {
                return
            }

            processedPacketMap[packetKey] = now

            val packet = mapOf(
                "messageId" to "PKT-${now.toString().takeLast(6)}",
                "originNodeId" to peerNodeId,
                "incidentType" to incidentType,
                "severity" to severity,
                "locationName" to locationName,
                "description" to "Received via offline BLE Mesh relay from $peerNodeId",
                "_direction" to "RECEIVED",
                "_rssi" to result.rssi,
                "_timestamp" to now
            )

            synchronized(receivedPackets) {
                receivedPackets.add(0, packet)
                if (receivedPackets.size > 50) receivedPackets.removeAt(receivedPackets.size - 1)
            }

            eventSink?.success(packet)
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "BLE Scan failed: $errorCode")
        }
    }
}
