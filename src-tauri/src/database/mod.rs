use rusqlite::Connection;
use std::path::Path;

pub mod migrations;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> crate::error::Result<Self> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)?;
            }
        }
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        migrations::migrate(&conn)?;
        Ok(Self { conn })
    }

    #[cfg(test)]
    pub fn open_in_memory() -> crate::error::Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations::migrate(&conn)?;
        Ok(Self { conn })
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    pub fn conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_in_memory_and_migrates() {
        let db = Database::open_in_memory().expect("open");
        let v: i64 = db
            .conn()
            .query_row("SELECT MAX(version) FROM schema_metadata", [], |r| r.get(0))
            .expect("version row");
        assert_eq!(v, migrations::SCHEMA_VERSION);
    }
}