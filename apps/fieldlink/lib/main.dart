import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Request BLE & Camera runtime permissions for offline mesh
  await [
    Permission.bluetoothScan,
    Permission.bluetoothAdvertise,
    Permission.bluetoothConnect,
    Permission.location,
    Permission.camera,
  ].request();

  runApp(const PravahaFieldLinkApp());
}

class PravahaFieldLinkApp extends StatelessWidget {
  const PravahaFieldLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PRAVAHA FieldLink',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        primaryColor: const Color(0xFF087F8C),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
