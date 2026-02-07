use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("missing environment variable: {0}")]
    MissingEnv(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("validation error: {0}")]
    Validation(String),

    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("unexpected response: {0}")]
    Unexpected(String),
}

pub type AppResult<T> = Result<T, AppError>;
