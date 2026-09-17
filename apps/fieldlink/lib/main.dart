import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PravahaFieldLinkApp());
}

class PravahaFieldLinkApp extends StatelessWidget {
  const PravahaFieldLinkApp({Key? key}) : super(key: key);

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
