import { describe, expect, it } from "vitest";
import { isPreauthorizedAdminEmail } from "./db";

describe("autorização antecipada de administrador", () => {
  it("reconhece o e-mail autorizado sem diferenciar maiúsculas, espaços ou acentos de domínio", () => {
    expect(isPreauthorizedAdminEmail("celsorosafilho@yahoo.com.br")).toBe(true);
    expect(isPreauthorizedAdminEmail(" CELSOrosafilho@YAHOO.COM.BR ")).toBe(true);
  });

  it("não concede administração a outros e-mails", () => {
    expect(isPreauthorizedAdminEmail("grupoalvasaude@gmail.com")).toBe(false);
    expect(isPreauthorizedAdminEmail(null)).toBe(false);
  });
});
