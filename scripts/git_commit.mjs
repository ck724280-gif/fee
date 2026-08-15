import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';

const rootDir = path.resolve('.');

const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.agents',
  'coverage',
  'build',
  'out',
  '.vercel',
]);

const IGNORE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production.local',
  '.env.development.local',
  'tsconfig.tsbuildinfo',
  '.DS_Store',
]);

function getFilesRecursively(dir, relativeDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const relPath = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...getFilesRecursively(path.join(dir, entry.name), relPath));
    } else if (entry.isFile()) {
      if (IGNORE_FILES.has(entry.name)) continue;
      if (entry.name.endsWith('.tsbuildinfo')) continue;
      files.push(relPath);
    }
  }
  return files;
}

async function main() {
  console.log('1. Initializing Git repository in:', rootDir);
  await git.init({ fs, dir: rootDir, defaultBranch: 'main' });

  console.log('2. Gathering project files...');
  const files = getFilesRecursively(rootDir);
  console.log(`Found ${files.length} files to commit.`);

  console.log('3. Staging files...');
  for (const file of files) {
    await git.add({ fs, dir: rootDir, filepath: file });
  }

  console.log('4. Creating commit...');
  const sha = await git.commit({
    fs,
    dir: rootDir,
    message: 'First commit - DPR Tuition Fee Management System',
    author: {
      name: 'ck724280-gif',
      email: 'ck724280@gmail.com',
    },
  });

  console.log('Commit SHA:', sha);

  console.log('5. Configuring remote origin...');
  try {
    await git.deleteRemote({ fs, dir: rootDir, remote: 'origin' });
  } catch (e) {}

  await git.addRemote({
    fs,
    dir: rootDir,
    remote: 'origin',
    url: 'https://github.com/ck724280-gif/DPR-FEE-MANAGEMENT.git',
    force: true,
  });

  console.log('✅ Git repository successfully initialized, staged, and committed!');
}

main().catch(err => {
  console.error('Git error:', err);
  process.exit(1);
});
