import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { emptyData, readData, type TrackerData } from './domain';

let database: SQLiteDatabase | undefined;
let inMemoryData: TrackerData | undefined;

function getDb(): SQLiteDatabase | null {
  try {
    if (!database) {
      const connection = openDatabaseSync('aura-tracker.db', {
        finalizeUnusedStatementsBeforeClosing: false,
      });
      connection.execSync('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)');
      database = connection;
    }
    return database;
  } catch (err) {
    console.error('SQLite connection error, using fallback:', err);
    return null;
  }
}

export function loadData(): TrackerData {
  try {
    const db = getDb();
    if (db) {
      const row = db.getFirstSync<{ data: string }>('SELECT data FROM app_state WHERE id = 1');
      if (row && row.data) {
        const parsed = readData(row.data);
        inMemoryData = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load SQLite data:', err);
  }
  return inMemoryData || emptyData();
}

export function persistData(data: TrackerData): void {
  inMemoryData = data;
  try {
    const db = getDb();
    if (db) {
      const json = JSON.stringify(data);
      db.runSync(
        'INSERT INTO app_state (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data',
        json
      );
    }
  } catch (err) {
    console.error('Failed to persist SQLite data:', err);
  }
}
