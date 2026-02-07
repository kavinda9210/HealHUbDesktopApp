use std::env;

use lettre::{
    message::{header::ContentType, Mailbox, Message},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};

use crate::error::{AppError, AppResult};

pub struct EmailService;

impl EmailService {
    pub async fn send_html(to_email: &str, subject: &str, html_body: &str) -> AppResult<()> {
        let smtp_server = env::var("MAIL_SERVER").map_err(|_| AppError::MissingEnv("MAIL_SERVER".to_string()))?;
        let smtp_port: u16 = env::var("MAIL_PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(587);
        let smtp_username = env::var("MAIL_USERNAME").map_err(|_| AppError::MissingEnv("MAIL_USERNAME".to_string()))?;
        let smtp_password = env::var("MAIL_PASSWORD").map_err(|_| AppError::MissingEnv("MAIL_PASSWORD".to_string()))?;
        let from = env::var("MAIL_DEFAULT_SENDER").unwrap_or_else(|_| smtp_username.clone());

        let email = Message::builder()
            .from(from.parse::<Mailbox>().map_err(|e| AppError::Validation(e.to_string()))?)
            .to(to_email
                .parse::<Mailbox>()
                .map_err(|e| AppError::Validation(e.to_string()))?)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html_body.to_string())
            .map_err(|e| AppError::Unexpected(e.to_string()))?;

        let creds = Credentials::new(smtp_username, smtp_password);

        let mailer: AsyncSmtpTransport<Tokio1Executor> = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp_server)
            .map_err(|e| AppError::Unexpected(e.to_string()))?
            .port(smtp_port)
            .credentials(creds)
            .build();

        mailer
            .send(email)
            .await
            .map_err(|e| AppError::Unexpected(e.to_string()))?;

        Ok(())
    }
}
