package com.pravaha.fieldlink

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.pravaha.fieldlink/ble"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val bleBridge = PravahaBleBridge(applicationContext)
        MethodChannel(flutterEngine.dartEntrypoint.binaryMessenger, CHANNEL)
            .setMethodCallHandler(bleBridge)
    }
}
