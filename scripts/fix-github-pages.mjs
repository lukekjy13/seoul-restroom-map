import { readFile, writeFile } from 'node:fs/promises';

// Vinext emits two runtime module references as /./_next/... when Vite uses a
// relative base. GitHub Pages treats that as a domain-root path, so normalize
// it to a path relative to the deployed repository.
for (const filename of ['dist/client/index.html', 'dist/client/404.html']) {
  const content = await readFile(filename, 'utf8');
  await writeFile(filename, content.replaceAll('"/./_next/', '"./_next/'));
}
