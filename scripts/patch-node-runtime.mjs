import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name === 'route.ts') out.push(p);
  }
  return out;
}

const RUNTIME = "export const runtime = 'nodejs';\n\n";

let updated = 0;
for (const file of walk('app/api')) {
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes("export const runtime = 'nodejs'")) continue;

  const lastImport = src.lastIndexOf('\nimport ');
  const nextLine = src.indexOf('\n', lastImport + 1);
  const insertAt = nextLine === -1 ? 0 : nextLine + 1;
  src = src.slice(0, insertAt) + RUNTIME + src.slice(insertAt);

  if (!src.includes('authError = await requireApiAuth')) {
    src = src.replace(
      /export async function (GET|POST|PUT|PATCH|DELETE)\(([^)]*)\) \{\n(\s*)try \{/g,
      (match, method, args, indent) =>
        `export async function ${method}(${args}) {\n${indent}const authError = await requireApiAuth(req as any);\n${indent}if (authError) return authError;\n${indent}try {`
    );
    src = src.replace(
      /export async function (GET|POST|PUT|PATCH|DELETE)\((req: Request[^)]*)\) \{\n/g,
      (match, method, args) => {
        if (match.includes('authError')) return match;
        return `export async function ${method}(${args}) {\n  const authError = await requireApiAuth(req as any);\n  if (authError) return authError;\n`;
      }
    );
  }

  fs.writeFileSync(file, src);
  updated++;
  console.log('patched', file);
}

console.log('Updated', updated, 'routes');
