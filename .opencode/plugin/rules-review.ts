// Adaptador opencode del centinela compartido (rules/centinela/main.ts).
// Toda la lógica vive en el motor Python; acá sólo se traduce el contrato
// de opencode (filePath/newString/content/command) a sus modos check/contexto.

const SCRIPT = "rules/centinela/main.ts"

export const RulesReview = async ({ directory }: { directory: string }) => {
  return {
    "tool.execute.before": async (input: any, output: any) => {
      const tool = input.tool
      const args = output.args ?? {}
      const run = (argv: string[], stdin?: string) =>
        Bun.spawnSync(["bun", SCRIPT, ...argv], {
          cwd: directory,
          input: stdin,
          stdout: "pipe",
          stderr: "pipe",
        })

      if (tool === "edit" || tool === "write") {
        const path = String(args?.filePath || args?.file_path || "").replace(/\\/g, "/")
        const texto =
          tool === "write"
            ? String(args?.content || "")
            : String(args?.newString || args?.new_string || "")
        if (!path || !texto) return
        const proc = run(["check", path], texto)
        let fallan: { regla: string; motivo?: string }[] = []
        try {
          fallan = JSON.parse(proc.stdout.toString() || "{}").fallan ?? []
        } catch {}
        if (fallan.length) {
          const lista = fallan
            .map((f) =>
              f.motivo ? `  ✗ ${f.regla}\n    ${f.motivo}\n` : `  ✗ ${f.regla}`,
            )
            .join("\n")
          throw new Error(
            `CHECKLIST DE REGLAS — ${path} no pasa ${fallan.length}:\n${lista}\n` +
              "Corregí el contenido y volvé a guardar. El texto completo de cada regla está en rules/.",
          )
        }
        return
      }

      if (tool === "bash") {
        const cmd = args?.command
        if (!cmd) return
        // Mismo canal que CANAL_BASH del motor: los checks `comando:` se evalúan contra la
        // línea de Bash, no contra un archivo. Sin esto, opencode ejecutaría lo que Claude
        // frena (`supabase db reset`).
        const prohibido = run(["check", "<bash>"], String(cmd))
        let fallanBash: { regla: string; motivo?: string }[] = []
        try {
          fallanBash = JSON.parse(prohibido.stdout.toString() || "{}").fallan ?? []
        } catch {}
        if (fallanBash.length) {
          const lista = fallanBash
            .map((f) => (f.motivo ? `  ✗ ${f.regla}\n    ${f.motivo}\n` : `  ✗ ${f.regla}`))
            .join("\n")
          throw new Error(
            `CHECKLIST DE REGLAS — el comando no pasa ${fallanBash.length}:\n${lista}\n` +
              "Corregí el comando. El texto completo de cada regla está en rules/.",
          )
        }
        const proc = run(["contexto", String(cmd)])
        const ctx = proc.stdout.toString().trim()
        if (ctx) console.log(`[rules-review] ${ctx}`)
      }
    },
  }
}
