// Hook SessionStart: inyecta en el contexto de Claude un resumen de la spec activa
// (últimas entradas de memory.md y próximas tareas pendientes de task.md).
// Nunca falla: si algo no existe, lo avisa y termina con código 0.
const fs = require('fs');
const path = require('path');

const MAX_ENTRIES = 3;
const MAX_PENDING = 10;

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const specsDir = process.env.SPECS_DIR || path.join(root, 'specs');

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function activeSpec() {
  if (!fs.existsSync(specsDir)) return null;
  const dirs = fs
    .readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{3}-/.test(d.name))
    .map((d) => d.name)
    .sort();
  return dirs.length ? dirs[dirs.length - 1] : null;
}

function recentEntries(memory) {
  // Las entradas son secciones "## " y están ordenadas de la más nueva a la más vieja.
  const sections = memory.split(/^(?=## )/m).filter((s) => s.startsWith('## '));
  return sections.slice(0, MAX_ENTRIES).map((s) => s.trim());
}

function pendingTasks(tasks) {
  const lines = tasks.split(/\r?\n/);
  const pending = lines.filter((l) => /^- \[ \] T\d+/.test(l));
  const done = lines.filter((l) => /^- \[x\] T\d+/i.test(l));
  return { pending, total: pending.length + done.length, done: done.length };
}

const out = [];
const spec = activeSpec();

if (!spec) {
  out.push('[contexto de la spec] No se encontró ninguna carpeta specs/NNN-*.');
} else {
  const dir = path.join(specsDir, spec);
  const rel = `specs/${spec}`;
  out.push(`# Contexto de la spec activa: ${rel}`);
  out.push(
    `Antes de empezar cualquier tarea, revisa ${rel}/task.md y ${rel}/memory.md (ver CLAUDE.md → "Flujo de trabajo con la spec").`,
  );

  const memory = readIfExists(path.join(dir, 'memory.md'));
  out.push('', `## Últimas entradas de ${rel}/memory.md`);
  if (memory === null) {
    out.push('(No existe memory.md: créalo con la primera entrada de la sesión.)');
  } else {
    const entries = recentEntries(memory);
    out.push(entries.length ? entries.join('\n\n') : '(memory.md no tiene entradas todavía.)');
  }

  const tasks = readIfExists(path.join(dir, 'task.md'));
  out.push('', `## Tareas de ${rel}/task.md`);
  if (tasks === null) {
    out.push('(No existe task.md.)');
  } else {
    const { pending, total, done } = pendingTasks(tasks);
    out.push(`Progreso: ${done}/${total} tareas hechas. Próximas pendientes:`);
    out.push(...(pending.length ? pending.slice(0, MAX_PENDING) : ['(No hay tareas pendientes.)']));
  }
}

process.stdout.write(out.join('\n') + '\n');
process.exit(0);
