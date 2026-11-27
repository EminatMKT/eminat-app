/** This legal text must remain identical in every locale and output. */
export const PRODUCTION_REPORT_DISCLAIMER = 'El beneficiario final del trabajo es Eminat (matriz), localizada en Estados Unidos.'

export const PRODUCTION_REPORT_SLOGAN = 'Full-service agency · Integrated marketing'

/**
 * Deliberate, tracked exception to AGENTS.md's no-hardcoded-approver-name convention: ported
 * verbatim from the unmerged `reports/print-signature-20261030` branch per Wagner's explicit
 * instruction. Real fix tracked in `.todo` under "Stratix — reporte de pago y RLS": read the
 * approver from the `leader` entry of `src/shared/auth/permissions/modulos`, not from here.
 */
export const REPORT_APPROVER_NAME = 'Freddy Crespín'

export const REPORT_APPROVER_TITLE = 'Marketing Director — Approved by'
