export const ORTHO_REFERENCE_OPTIONS = ["Dentista", "Paciente", "Marketing", "Não se aplica"] as const;
/** Referências visíveis apenas na Comissão Clínica – Ortoimplant. */
export const CLINIC_REFERENCE_OPTIONS = ["Dentista", "Paciente", "Google", "Não se aplica"] as const;
export const ORTHO_TREATMENTS = ["Implante", "Prótese", "Orto", "Clínica geral"] as const;

export type OrthoReference = (typeof ORTHO_REFERENCE_OPTIONS)[number];
export type ClinicReference = (typeof CLINIC_REFERENCE_OPTIONS)[number];
export type OrthoTreatment = (typeof ORTHO_TREATMENTS)[number];
