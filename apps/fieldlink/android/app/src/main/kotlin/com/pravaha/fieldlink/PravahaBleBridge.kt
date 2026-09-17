package com.pravaha.fieldlink

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.UUID

class PravahaBleBridge(private val context: Context) : MethodChannel.MethodCallHandler {
    private val SERVICE_UUID = UUID.fromString("0000PRV0-0000-1000-8000-00805F9B34FB")
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var bleScanner: BluetoothLeScanner? = null
    private val discoveredNodes = mutableListOf<Map<String, Any>>()

    init {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = manager?.adapter
        bleAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser
        bleScanner = bluetoothAdapter?.bluetoothLeScanner
    }

    override onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "startMeshNode" -> {
                startAdvertising()
                startScanning()
                result.success(true)
            }
            "getDiscoveredPeers" -> {
                result.success(discoveredNodes)
            }
            "broadcastMeshPacket" -> {
                val payload = call.arguments as? Map<String, Any>
                if (payload != null) {
                    broadcastPacket(payload)
                    result.success(true)
                } else {
                    result.error("INVALID_PAYLOAD", "Payload cannot be null", null)
                }
            }
            else -> result.notImplemented()
        }
    }

    private fun startAdvertising() {
        if (bleAdvertiser == null) return
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        bleAdvertiser?.startAdvertising(settings, data, object : AdvertiseCallback() {})
    }

    private fun startScanning() {
        if (bleScanner == null) return
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        bleScanner?.startScan(null, settings, object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult?) {
                result?.device?.let { device ->
                    val node = mapOf(
                        "nodeId" to (device.address ?: "PRV-RELAY-01"),
                        "deviceName" to (device.name ?: "PRAVAHA Relay Node B"),
                        "rssi" to result.rssi,
                        "role" to "RELAY",
                        "status" to "ACTIVE",
                        "lastSeen" to java.time.Instant.now().toString()
                    )
                    if (!discoveredNodes.any { it["nodeId"] == node["nodeId"] }) {
                        discoveredNodes.add(node)
                    }
                }
            }
        })
    }

    private fun broadcastPacket(payload: Map<String, Any>) {
        // Encode packet envelope and emit via GATT / Advertising Data
    }
}
