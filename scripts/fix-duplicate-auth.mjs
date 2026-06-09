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

const block = `  const authError = await requireApiAuth(req as any);
  if (authError) return authError;
`;

for (const file of walk('app/api')) {
  let src = fs.readFileSync(file, 'utf8');
  while (src.includes(block + block)) {
    src = src.replace(block + block, block);
  }
  fs.writeFileSync(file, src);
}
