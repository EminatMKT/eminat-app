# En progreso — Eminat App

_Última actualización: 2026-07-09_

- [ ] **[Auth/RLS] Fix `auth_id` NULL en usuarios creados por admin** — 🔄 **En PR #28 → `development`, pendiente review + deploy.** `create-user` seteaba `usuarios.id` pero no `auth_id`; la RLS gatea por `auth_id = auth.uid()`, así que los usuarios del panel admin quedaban sin acceso a datos de su módulo (Royner/`investigacion` no podía guardar research leads). Fix: `create-user` setea `auth_id`; migración backfill `auth_id = id`; `saveLead` surfacea el error del INSERT. Confirmado en prod + reproducido en Supabase local. Post-merge: `db push` a prod (`ruedelunbtaomhrzgelc`) + redeploy, o `UPDATE` one-off para desbloquear a Royner ya. _(creado por: EminatMKT · 2026-07-09)_
