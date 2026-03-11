export type AmbulanceStatus = {
  ambulance_id: number;
  ambulance_number: string;
  driver_name: string;
  driver_phone: string;
  current_latitude?: number | null;
  current_longitude?: number | null;
  is_available: boolean;
  last_updated?: string | null;
};

export type AmbulanceRequest = {
  notification_id: number;
  title: string;
  message: string;
  created_at?: string;
  is_read?: boolean;
};

export type ActiveMission = {
  requestId: number;
  title: string;
  message: string;
  patientLat: number;
  patientLng: number;
  acceptedAt: string;
};
