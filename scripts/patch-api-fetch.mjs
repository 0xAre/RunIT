import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TARGETS = ['app', 'components'];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.tsx') || ent.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

let updated = 0;
for (const base of TARGETS) {
  for (const file of walk(base)) {
    if (file.includes('app/api/')) continue;
    let src = fs.readFileSync(file, 'utf8');
    if (!src.includes("fetch('/api/") && !src.includes('fetch("/api/')) continue;

    if (!src.includes("from '@/lib/api-fetch'")) {
      const importLine = "import { apiFetch } from '@/lib/api-fetch';\n";
      const useClient = src.startsWith("'use client'") || src.startsWith('"use client"');
      if (useClient) {
        src = src.replace(/^(['"])use client\1;\n\n?/, (m) => m + importLine);
        if (!src.includes("from '@/lib/api-fetch'")) {
          src = importLine + src;
        }
      } else {
        src = importLine + src;
      }
    }

    const next = src.replace(/fetch\((['`])\/api\//g, "apiFetch($1/api/");
    if (next === src) continue;
    fs.writeFileSync(file, next);
    updated++;
    console.log('patched', file);
  }
}

console.log('Updated', updated, 'client files');
