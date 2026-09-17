import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/field_report.dart';

class OfflineStorage {
  static final OfflineStorage instance = OfflineStorage._init();
  static Database? _database;

  OfflineStorage._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('pravaha_fieldlink.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE field_reports (
        id TEXT PRIMARY KEY,
        incidentType TEXT NOT NULL,
        severity TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        locationName TEXT NOT NULL,
        description TEXT,
        syncStatus TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        originNodeId TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE mesh_outbox (
        messageId TEXT PRIMARY KEY,
        originNodeId TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        ttl INTEGER NOT NULL,
        hopCount INTEGER NOT NULL,
        status TEXT NOT NULL
      )
    ''');
  }

  Future<int> insertReport(FieldReport report) async {
    final db = await instance.database;
    return await db.insert('field_reports', report.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<FieldReport>> getAllReports() async {
    final db = await instance.database;
    final result = await db.query('field_reports', orderBy: 'createdAt DESC');
    return result.map((json) => FieldReport.fromMap(json)).toList();
  }

  Future<List<FieldReport>> getUnsyncedReports() async {
    final db = await instance.database;
    final result = await db.query(
      'field_reports',
      where: 'syncStatus != ?',
      whereArgs: ['SYNCED'],
    );
    return result.map((json) => FieldReport.fromMap(json)).toList();
  }

  Future<int> updateReportSyncStatus(String id, String status) async {
    final db = await instance.database;
    return await db.update(
      'field_reports',
      {'syncStatus': status},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
