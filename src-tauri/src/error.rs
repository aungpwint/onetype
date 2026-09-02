use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
}

impl AppError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            code: "validation_error".into(),
            message: message.into(),
        }
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: "not_found".into(),
            message: message.into(),
        }
    }

    pub fn import_error(message: impl Into<String>) -> Self {
        Self {
            code: "import_error".into(),
            message: message.into(),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        Self {
            code: "database_error".into(),
            message: format!("Database error: {e}"),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        Self {
            code: "io_error".into(),
            message: format!("File error: {e}"),
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        Self {
            code: "parse_error".into(),
            message: format!("Could not parse data: {e}"),
        }
    }
}

impl From<std::time::SystemTimeError> for AppError {
    fn from(e: std::time::SystemTimeError) -> Self {
        Self {
            code: "time_error".into(),
            message: format!("Time error: {e}"),
        }
    }
}

pub type Result<T> = std::result::Result<T, AppError>;