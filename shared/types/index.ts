export type {
  UploadScanImageInput,
  UploadScanImageOutput,
  AnalyzeScanInput,
  AnalyzeScanOutput,
  ScanResult,
  GetUserScansInput,
  GetUserScansOutput,
  ScanRecord,
} from "../schemas/scan.schema";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  service_name: string;
  appointment_date: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
}
