// dump-project.js
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// Directories to skip entirely
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.next', 'tmp', '.cache', '.turbo', 'uploads', 'logs'
]);

// Files to skip
const EXCLUDE_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'project-dump.json'
]);

// Only include these extensions (set to null to include everything)
const INCLUDE_EXT = [
  '.ts', '.js', '.prisma', '.json', '.sql', '.md',
  '.yml', '.yaml', '.env.example'
];

// Never dump real secrets
const SECRET_FILES = ['.env', '.env.local', '.env.production'];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else {
      if (EXCLUDE_FILES.has(entry.name)) continue;
      if (SECRET_FILES.includes(entry.name)) continue;
      if (INCLUDE_EXT && !INCLUDE_EXT.includes(path.extname(entry.name))) continue;

      try {
        out[rel] = fs.readFileSync(full, 'utf8');
      } catch (e) {
        out[rel] = `<<unreadable: ${e.message}>>`;
      }
    }
  }
}

const result = {
  _meta: {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    fileCount: 0
  }
};

walk(ROOT, result);
result._meta.fileCount = Object.keys(result).length - 1;

fs.writeFileSync('project-dump.json', JSON.stringify(result, null, 2));
console.log(`✅ Dumped ${result._meta.fileCount} files → project-dump.json`);