package com.pravaha.mesh

import android.app.Service
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import android.os.ParcelUuid
import android.util.Log
import java.util.*
import java.nio.charset.StandardCharsets

/**
 * PRAVAHA Android Bluetooth Low Energy Mesh & Store-and-Forward Service
 * Compatible with Android 12+ (API 31+) permissions model.
 */
class PravahaMeshBleService : Service() {

    companion object {
        const val TAG = "PravahaMeshService"
        val MESH_SERVICE_UUID: UUID = UUID.fromString("0000PRV0-0000-1000-8000-00805F9B34FB")
        val MESH_CHARACTERISTIC_UUID: UUID = UUID.fromString("0000PRV1-0000-1000-8000-00805F9B34FB")
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeScanner: BluetoothLeScanner? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null

    private val localNodeId: String = "PRV-NODE-" + UUID.randomUUID().toString().substring(0, 5).uppercase()
    private val messageCache = HashSet<String>()
    private val offlineQueue = ArrayList<String>()

    private val binder = LocalBinder()

    inner class LocalBinder : Binder() {
        fun getService(): PravahaMeshBleService = this@PravahaMeshBleService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = manager.adapter
        bluetoothLeScanner = bluetoothAdapter?.bluetoothLeScanner
        bluetoothLeAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser

        setupGattServer(manager)
        startBleAdvertising()
        startBleScan()
        Log.i(TAG, "PRAVAHA Mesh Service Initialized with Node ID: $localNodeId")
    }

    private fun setupGattServer(manager: BluetoothManager) {
        gattServer = manager.openGattServer(this, object : BluetoothGattServerCallback() {
            override fun onCharacteristicWriteRequest(
                device: BluetoothDevice?,
                requestId: Int,
                characteristic: BluetoothGattCharacteristic?,
                preparedWrite: Boolean,
                responseNeeded: Boolean,
                offset: Int,
                value: ByteArray?
            ) {
                super.onCharacteristicWriteRequest(device, requestId, characteristic, preparedWrite, responseNeeded, offset, value)
                if (value != null) {
                    val rawMessage = String(value, StandardCharsets.UTF_8)
                    Log.d(TAG, "Received Mesh Packet from ${device?.address}: $rawMessage")
                    processIncomingMeshPayload(rawMessage)
                }
                if (responseNeeded) {
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                }
            }
        })

        val service = BluetoothGattService(MESH_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        val characteristic = BluetoothGattCharacteristic(
            MESH_CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
        )
        service.addCharacteristic(characteristic)
        gattServer?.addService(service)
    }

    private fun startBleAdvertising() {
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .addServiceUuid(ParcelUuid(MESH_SERVICE_UUID))
            .build()

        try {
            bluetoothLeAdvertiser?.startAdvertising(settings, data, advertiseCallback)
            Log.i(TAG, "Started BLE Advertising for PRAVAHA Mesh")
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing BLUETOOTH_ADVERTISE permission", e)
        }
    }

    private fun startBleScan() {
        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(MESH_SERVICE_UUID))
            .build()

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        try {
            bluetoothLeScanner?.startScan(listOf(scanFilter), scanSettings, scanCallback)
            Log.i(TAG, "Started Scanning for Nearby PRAVAHA Nodes")
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing BLUETOOTH_SCAN permission", e)
        }
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            Log.i(TAG, "BLE Advertising active.")
        }
        override fun onStartFailure(errorCode: Int) {
            Log.e(TAG, "BLE Advertising failed: $errorCode")
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            val device = result?.device ?: return
            Log.d(TAG, "Discovered PRAVAHA Mesh Device: ${device.name} [${device.address}] RSSI: ${result.rssi}")
        }
    }

    private fun processIncomingMeshPayload(payloadJson: String) {
        // De-duplication check using Message ID hash
        val messageHash = payloadJson.hashCode().toString()
        if (messageCache.contains(messageHash)) {
            Log.d(TAG, "Duplicate mesh message $messageHash discarded.")
            return
        }

        messageCache.add(messageHash)
        offlineQueue.add(payloadJson)
        Log.i(TAG, "Stored message in local store-and-forward queue. Queue size: ${offlineQueue.size}")
    }

    fun getLocalNodeId(): String = localNodeId

    override fun onDestroy() {
        try {
            bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
            bluetoothLeScanner?.stopScan(scanCallback)
            gattServer?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error shutting down BLE service", e)
        }
        super.onDestroy()
    }
}
