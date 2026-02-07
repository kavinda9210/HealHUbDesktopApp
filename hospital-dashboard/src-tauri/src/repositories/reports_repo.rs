use crate::{
    entities::report::{MedicalReport, PrescriptionRecord},
    error::AppResult,
    repositories::supabase::SupabaseRestClient,
};

#[derive(Clone)]
pub struct ReportsRepo {
    client: SupabaseRestClient,
}

impl ReportsRepo {
    pub fn new(client: SupabaseRestClient) -> Self {
        Self { client }
    }

    pub async fn medical_reports_for_appointment_ids(&self, appointment_ids: &[i32]) -> AppResult<Vec<MedicalReport>> {
        if appointment_ids.is_empty() {
            return Ok(vec![]);
        }
        let list = appointment_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        self.client
            .select::<MedicalReport>(
                "medical_reports",
                &format!("appointment_id=in.({})&order=created_at.desc", list),
            )
            .await
    }

    pub async fn medical_reports_for_clinic_ids(&self, clinic_ids: &[i32]) -> AppResult<Vec<MedicalReport>> {
        if clinic_ids.is_empty() {
            return Ok(vec![]);
        }
        let list = clinic_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        self.client
            .select::<MedicalReport>(
                "medical_reports",
                &format!("clinic_id=in.({})&order=created_at.desc", list),
            )
            .await
    }

    pub async fn prescriptions_for_appointment_ids(&self, appointment_ids: &[i32]) -> AppResult<Vec<PrescriptionRecord>> {
        if appointment_ids.is_empty() {
            return Ok(vec![]);
        }
        let list = appointment_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        self.client
            .select::<PrescriptionRecord>(
                "prescription_records",
                &format!("appointment_id=in.({})&order=created_at.desc", list),
            )
            .await
    }

    pub async fn prescriptions_for_clinic_ids(&self, clinic_ids: &[i32]) -> AppResult<Vec<PrescriptionRecord>> {
        if clinic_ids.is_empty() {
            return Ok(vec![]);
        }
        let list = clinic_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        self.client
            .select::<PrescriptionRecord>(
                "prescription_records",
                &format!("clinic_id=in.({})&order=created_at.desc", list),
            )
            .await
    }
}
