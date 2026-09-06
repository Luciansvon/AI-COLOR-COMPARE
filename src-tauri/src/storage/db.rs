use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MasterRecord {
    pub id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub nominal_l: Option<f64>,
    pub nominal_a: Option<f64>,
    pub nominal_b: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedQCRecord {
    pub id: String,
    pub session_id: String,
    pub timestamp: String,
    pub product_name: String,
    pub master_code: String,
    pub source_image_name: String,
    pub metadata_json: String,
    pub rois_json: String,
    pub global_correction_json: Option<String>,
    pub conflict_check_json: Option<String>,
    pub final_decision: String,
    pub fail_reasons_json: Option<String>,
    pub operator_note: Option<String>,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> Result<()> {
        // Table: schema_version
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );",
            [],
        )?;

        let current_version: i32 = self
            .conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version;",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if current_version < 1 {
            // Migration 1: Master Library
            self.conn.execute(
                "CREATE TABLE IF NOT EXISTS masters (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT,
                    nominal_l REAL,
                    nominal_a REAL,
                    nominal_b REAL,
                    created_at TEXT NOT NULL
                );",
                [],
            )?;

            // Migration 1: QC Records History
            self.conn.execute(
                "CREATE TABLE IF NOT EXISTS qc_records (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    master_code TEXT NOT NULL,
                    source_image_name TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    rois_json TEXT NOT NULL,
                    global_correction_json TEXT,
                    conflict_check_json TEXT,
                    final_decision TEXT NOT NULL,
                    fail_reasons_json TEXT,
                    operator_note TEXT
                );",
                [],
            )?;

            // Insert initial default masters
            self.conn.execute(
                "INSERT OR IGNORE INTO masters (id, code, name, category, description, nominal_l, nominal_a, nominal_b, created_at)
                 VALUES 
                 ('master-wn04', 'WN-04', 'Walnut Dark Satin', 'wood', 'Papan master fisik kayu Walnut gelap standar finishing satin studio.', 28.5, 8.2, 12.6, datetime('now')),
                 ('master-oa02', 'OA-02', 'Natural White Oak Matte', 'wood', 'Papan master kayu Oak cerah alami dengan pelindung transparan matte.', 62.4, 5.1, 24.3, datetime('now')),
                 ('master-tk01', 'TK-01', 'Teak Heritage Golden', 'wood', 'Papan master kayu jati tua cokelat keemasan hangat.', 45.2, 14.3, 31.8, datetime('now'));",
                [],
            )?;

            self.conn.execute(
                "INSERT INTO schema_version (version, applied_at) VALUES (1, datetime('now'));",
                [],
            )?;
        }

        Ok(())
    }

    pub fn insert_master(&self, master: &MasterRecord) -> Result<()> {
        self.conn.execute(
            "INSERT INTO masters (id, code, name, category, description, nominal_l, nominal_a, nominal_b, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
            params![
                master.id,
                master.code,
                master.name,
                master.category,
                master.description,
                master.nominal_l,
                master.nominal_a,
                master.nominal_b,
                master.created_at
            ],
        )?;
        Ok(())
    }

    pub fn list_masters(&self) -> Result<Vec<MasterRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, code, name, category, description, nominal_l, nominal_a, nominal_b, created_at
             FROM masters ORDER BY code ASC;",
        )?;

        let master_iter = stmt.query_map([], |row| {
            Ok(MasterRecord {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                description: row.get(4)?,
                nominal_l: row.get(5)?,
                nominal_a: row.get(6)?,
                nominal_b: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;

        let mut list = Vec::new();
        for m in master_iter {
            list.push(m?);
        }
        Ok(list)
    }

    pub fn insert_qc_record(&self, record: &SavedQCRecord) -> Result<()> {
        self.conn.execute(
            "INSERT INTO qc_records (
                id, session_id, timestamp, product_name, master_code, source_image_name,
                metadata_json, rois_json, global_correction_json, conflict_check_json,
                final_decision, fail_reasons_json, operator_note
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13);",
            params![
                record.id,
                record.session_id,
                record.timestamp,
                record.product_name,
                record.master_code,
                record.source_image_name,
                record.metadata_json,
                record.rois_json,
                record.global_correction_json,
                record.conflict_check_json,
                record.final_decision,
                record.fail_reasons_json,
                record.operator_note
            ],
        )?;
        Ok(())
    }

    pub fn list_qc_records(&self) -> Result<Vec<SavedQCRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, session_id, timestamp, product_name, master_code, source_image_name,
                    metadata_json, rois_json, global_correction_json, conflict_check_json,
                    final_decision, fail_reasons_json, operator_note
             FROM qc_records ORDER BY timestamp DESC;",
        )?;

        let record_iter = stmt.query_map([], |row| {
            Ok(SavedQCRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                timestamp: row.get(2)?,
                product_name: row.get(3)?,
                master_code: row.get(4)?,
                source_image_name: row.get(5)?,
                metadata_json: row.get(6)?,
                rois_json: row.get(7)?,
                global_correction_json: row.get(8)?,
                conflict_check_json: row.get(9)?,
                final_decision: row.get(10)?,
                fail_reasons_json: row.get(11)?,
                operator_note: row.get(12)?,
            })
        })?;

        let mut list = Vec::new();
        for r in record_iter {
            list.push(r?);
        }
        Ok(list)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_initialization_and_default_masters() {
        let db = Database::memory().expect("Gagal inisialisasi in-memory DB");
        let masters = db.list_masters().expect("Gagal membaca daftar master");
        assert_eq!(masters.len(), 3);
        assert_eq!(masters[0].code, "OA-02");
        assert_eq!(masters[1].code, "TK-01");
        assert_eq!(masters[2].code, "WN-04");
    }

    #[test]
    fn test_insert_and_retrieve_qc_record() {
        let db = Database::memory().expect("Gagal inisialisasi in-memory DB");
        let record = SavedQCRecord {
            id: "qc-test-01".to_string(),
            session_id: "sess-01".to_string(),
            timestamp: "2026-09-06T09:00:00Z".to_string(),
            product_name: "Dining Chair Oak".to_string(),
            master_code: "OA-02".to_string(),
            source_image_name: "IMG_0042.CR3".to_string(),
            metadata_json: "{}".to_string(),
            rois_json: "[]".to_string(),
            global_correction_json: None,
            conflict_check_json: None,
            final_decision: "PASS".to_string(),
            fail_reasons_json: None,
            operator_note: Some("Warna sangat konsisten".to_string()),
        };

        db.insert_qc_record(&record).expect("Gagal insert QC record");
        let list = db.list_qc_records().expect("Gagal retrieve QC records");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "qc-test-01");
        assert_eq!(list[0].final_decision, "PASS");
    }
}
