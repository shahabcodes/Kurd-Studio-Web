export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  budget?: string;
  message: string;
}

export interface ContactResponse {
  id: number;
  message: string;
}

export interface ValidationErrors {
  errors: Record<string, string[]>;
}
