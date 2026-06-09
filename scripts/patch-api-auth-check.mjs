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

const OLD = `  const authResult = await requireApiAuth(req);
  if (authResult instanceof NextResponse) return authResult;
`;

const NEW = `  const authError = await requireApiAuth(req);
  if (authError) return authError;
`;

let updated = 0;
for (const file of walk('app/api')) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes(OLD.trim().split('\n')[0])) continue;
  src = src.replace(OLD, NEW);
  fs.writeFileSync(file, src);
  updated++;
  console.log('fixed', file);
}

console.log('Updated', updated, 'routes');
