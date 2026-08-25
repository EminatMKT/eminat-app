// Puente entre opencode y el centinela de reglas de Claude Code.
// Reutiliza .claude/hooks/rules-review.py tal cual: le arma el payload
// { tool_name, tool_input } que espera por stdin y traduce su contrato
// (exit 2 = bloquear, additionalContext = contexto para el modelo).

const SCRIPT = ".claude/hooks/rules-review.py"

function payload(tool: string, args: any) {
  if (tool === "edit" || tool === "write") {
    const path = (args?.filePath || args?.file_path || "").replace(/\\/g, "/")
    const texto =
      tool === "write"
        ? args?.content || ""
        : args?.newString || args?.new_string || ""
    if (!path || !texto) return null
    return {
      tool_name: tool === "write" ? "Write" : "Edit",
      tool_input:
        tool === "write"
          ? { file_path: path, content: texto }
          : { file_path: path, new_string: texto },
    }
  }
  if (tool === "bash") {
    const cmd = args?.command ?? ""
    return cmd ? { tool_name: "Bash", tool_input: { command: cmd } } : null
  }
  return null
}

export const RulesReview = async ({ directory }: { directory: string }) => {
  return {
    "tool.execute.before": async (input: any, output: any) => {
      const p = payload(input.tool, output.args)
      if (!p) return
      const proc = Bun.spawnSync(["python3", SCRIPT], {
        cwd: directory,
        input: JSON.stringify(p),
        stdout: "pipe",
        stderr: "pipe",
      })
      const out = proc.stdout.toString().trim()
      if (out) {
        try {
          const ctx =
            JSON.parse(out)?.hookSpecificOutput?.additionalContext
          if (ctx) console.log(`[rules-review] ${ctx}`)
        } catch {}
      }
      if (proc.exitCode === 2) {
        throw new Error(
          proc.stderr.toString().trim() ||
            "Bloqueado por rules-review (rules/)",
        )
      }
    },
  }
}
