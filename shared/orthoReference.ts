export const ORTHO_REFERENCE_OPTIONS = ["Dentista", "Paciente", "Marketing", "Não se aplica"] as const;
export const ORTHO_TREATMENTS = ["Implante", "Prótese", "Orto", "Clínica geral"] as const;

export type OrthoReference = (typeof ORTHO_REFERENCE_OPTIONS)[number];
export type OrthoTreatment = (typeof ORTHO_TREATMENTS)[number];
