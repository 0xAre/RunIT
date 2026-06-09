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

const AUTH_BLOCK = `  const authResult = await requireApiAuth(req);
  if (authResult instanceof NextResponse) return authResult;
`;

let updated = 0;
for (const file of walk('app/api')) {
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('requireApiAuth')) continue;

  if (!src.includes("from '@/lib/require-api-auth'")) {
    src = src.replace(
      /import \{([^}]+)\} from 'next\/server';/,
      "import {$1} from 'next/server';\nimport { requireApiAuth } from '@/lib/require-api-auth';"
    );
  }

  src = src.replace(
    /export async function (GET|POST|PUT|PATCH|DELETE)\((req: NextRequest[^)]*)\) \{\n/g,
    (match, method, args) => {
      if (match.includes('authResult')) return match;
      return `export async function ${method}(${args}) {\n${AUTH_BLOCK}`;
    }
  );

  fs.writeFileSync(file, src);
  updated++;
  console.log('patched', file);
}

console.log('Updated', updated, 'routes');
