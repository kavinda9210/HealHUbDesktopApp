use std::env;

use reqwest::header::{HeaderMap, HeaderValue};
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct SupabaseRestClient {
    base_url: String,
    api_key: String,
    http: reqwest::Client,
}

impl SupabaseRestClient {
    pub fn from_env() -> AppResult<Self> {
        let base_url = env::var("SUPABASE_URL")
            .map_err(|_| AppError::MissingEnv("SUPABASE_URL".to_string()))?;

        // For now, we prefer service role key because admin/doctor dashboard needs elevated access.
        // You can also set SUPABASE_ANON_KEY and tighten RLS later.
        let api_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
            .or_else(|_| env::var("SUPABASE_KEY"))
            .or_else(|_| env::var("SUPABASE_ANON_KEY"))
            .map_err(|_| AppError::MissingEnv("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY/SUPABASE_ANON_KEY)".to_string()))?;

        let http = reqwest::Client::builder().build()?;

        Ok(Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key,
            http,
        })
    }

    fn base_headers(&self, extra: Option<HeaderMap>) -> AppResult<HeaderMap> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "apikey",
            HeaderValue::from_str(&self.api_key).map_err(|e| AppError::Unexpected(e.to_string()))?,
        );
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {}", self.api_key))
                .map_err(|e| AppError::Unexpected(e.to_string()))?,
        );

        if let Some(extra) = extra {
            for (k, v) in extra.into_iter() {
                if let Some(k) = k {
                    headers.insert(k, v);
                }
            }
        }

        Ok(headers)
    }

    fn rest_url(&self, table: &str, query: Option<&str>) -> String {
        match query {
            Some(q) if !q.is_empty() => format!("{}/rest/v1/{}?{}", self.base_url, table, q),
            _ => format!("{}/rest/v1/{}", self.base_url, table),
        }
    }

    pub async fn select<T: DeserializeOwned>(&self, table: &str, query: &str) -> AppResult<Vec<T>> {
        let url = self.rest_url(table, Some(query));
        let resp = self
            .http
            .get(url)
            .headers(self.base_headers(None)?)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Unexpected(format!(
                "supabase select failed: {} {}",
                status, body
            )));
        }

        Ok(resp.json::<Vec<T>>().await?)
    }

    pub async fn insert<T: DeserializeOwned, B: Serialize>(&self, table: &str, body: &B) -> AppResult<Vec<T>> {
        let url = self.rest_url(table, Some("select=*"));
        let mut extra = HeaderMap::new();
        extra.insert(
            "prefer",
            HeaderValue::from_static("return=representation"),
        );

        let resp = self
            .http
            .post(url)
            .headers(self.base_headers(Some(extra))?)
            .json(body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Unexpected(format!(
                "supabase insert failed: {} {}",
                status, body
            )));
        }

        Ok(resp.json::<Vec<T>>().await?)
    }

    pub async fn update<T: DeserializeOwned, B: Serialize>(
        &self,
        table: &str,
        filter_query: &str,
        body: &B,
    ) -> AppResult<Vec<T>> {
        let url = self.rest_url(table, Some(&format!("{}&select=*", filter_query)));
        let mut extra = HeaderMap::new();
        extra.insert(
            "prefer",
            HeaderValue::from_static("return=representation"),
        );

        let resp = self
            .http
            .patch(url)
            .headers(self.base_headers(Some(extra))?)
            .json(body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Unexpected(format!(
                "supabase update failed: {} {}",
                status, body
            )));
        }

        Ok(resp.json::<Vec<T>>().await?)
    }

    pub async fn delete<T: DeserializeOwned>(&self, table: &str, filter_query: &str) -> AppResult<Vec<T>> {
        let url = self.rest_url(table, Some(&format!("{}&select=*", filter_query)));
        let mut extra = HeaderMap::new();
        extra.insert(
            "prefer",
            HeaderValue::from_static("return=representation"),
        );

        let resp = self
            .http
            .delete(url)
            .headers(self.base_headers(Some(extra))?)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::Unexpected(format!(
                "supabase delete failed: {} {}",
                status, body
            )));
        }

        Ok(resp.json::<Vec<T>>().await?)
    }
}
