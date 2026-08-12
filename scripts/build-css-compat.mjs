import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const buildRoot = join(projectRoot, 'public', 'build');
const manifestPath = join(buildRoot, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const cssEntry = manifest['resources/css/app.css'];

if (!cssEntry?.file) {
    throw new Error('CSS entry not found in the Vite manifest.');
}

const oldRelativePath = cssEntry.file;
const oldAbsolutePath = join(buildRoot, oldRelativePath);
const source = await readFile(oldAbsolutePath);
const { code } = transform({
    filename: oldAbsolutePath,
    code: source,
    minify: true,
    targets: {
        // Lightning CSS encodes browser versions as major.minor.patch.
        chrome: 106 << 16,
    },
});

const extension = extname(oldRelativePath);
const baseName = oldRelativePath.slice(0, -extension.length).replace(/-[^-]+$/, '');
const hash = createHash('sha256').update(code).digest('base64url').slice(0, 8);
const newRelativePath = `${baseName}-${hash}${extension}`;
const newAbsolutePath = join(buildRoot, newRelativePath);

await writeFile(oldAbsolutePath, code);
if (newAbsolutePath !== oldAbsolutePath) {
    await rename(oldAbsolutePath, newAbsolutePath);
}

for (const entry of Object.values(manifest)) {
    if (entry.file === oldRelativePath) entry.file = newRelativePath;
    if (entry.css) {
        entry.css = entry.css.map((path) => path === oldRelativePath ? newRelativePath : path);
    }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
