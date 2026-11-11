/**
 * One-time restructure: moves modules into feature folders with `git mv` and
 * rewrites every relative import to match. Run from the repo root:
 *
 *   node restructure.mjs
 *
 * Delete this file afterwards.
 */
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	statSync,
	writeFileSync
} from 'node:fs';
import path from 'node:path';

const MOVES = [
	['src/services/backgrounds.ts', 'src/newtab/backgrounds.ts'],
	['src/services/backgrounds.test.ts', 'src/newtab/backgrounds.test.ts'],
	['src/services/bookmarks.ts', 'src/newtab/bookmarks.ts'],
	['src/services/bookmarks.test.ts', 'src/newtab/bookmarks.test.ts'],
	['src/services/commands.ts', 'src/newtab/pluginCommands.ts'],
	['src/services/commands.test.ts', 'src/newtab/pluginCommands.test.ts'],
	['src/services/overlayContrast.ts', 'src/newtab/overlayContrast.ts'],
	['src/services/overlayContrast.test.ts', 'src/newtab/overlayContrast.test.ts'],
	['src/services/quotes.ts', 'src/newtab/quotes.ts'],
	['src/services/quotes.test.ts', 'src/newtab/quotes.test.ts'],
	['src/services/tabNavigation.ts', 'src/tabs/tabNavigation.ts'],
	['src/services/tabNavigation.test.ts', 'src/tabs/tabNavigation.test.ts'],
	['src/services/clusters.ts', 'src/clusters/clusters.ts'],
	['src/services/clusters.test.ts', 'src/clusters/clusters.test.ts'],
	['src/services/clusterCreation.ts', 'src/clusters/clusterCreation.ts'],
	['src/services/clusterCreation.test.ts', 'src/clusters/clusterCreation.test.ts'],
	['src/services/newTabHijack.ts', 'src/obsidian/newTabHijack.ts'],
	['src/services/newTabHijack.test.ts', 'src/obsidian/newTabHijack.test.ts'],
	['src/services/stackedTabPanes.ts', 'src/obsidian/stackedTabPanes.ts'],
	['src/services/stackedTabPanes.test.ts', 'src/obsidian/stackedTabPanes.test.ts'],
	['src/services/versionCheck.ts', 'src/obsidian/versionCheck.ts'],
	['src/TabCandyView.tsx', 'src/obsidian/TabCandyView.tsx'],
	['src/TabCandyView.test.tsx', 'src/obsidian/TabCandyView.test.tsx'],
	['src/settings/SettingsTab.ts', 'src/obsidian/SettingsTab.ts'],
	['src/settings/settingsTab.test.ts', 'src/obsidian/SettingsTab.test.ts'],
];

const moveMap = new Map(MOVES);
const EXTENSIONS = [
	'',
	'.ts',
	'.tsx',
	'.js',
	'/index.ts',
	'/index.tsx'
];
const SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\bvi\.(?:mock|importActual|doMock)\s*\(\s*)(['"])(\.{1,2}\/[^'"]*|\.\.)\2/g;

/**
 * Lists every file under a directory.
 *
 * @param dir - Directory to walk.
 * @returns Repo-relative paths with forward slashes.
 */
function walk(dir) {
	const found = [];
	for (const name of readdirSync(dir)) {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) {
			found.push(...walk(full));
		} else {
			found.push(full.split(path.sep).join('/'));
		}
	}
	return found;
}

/**
 * Resolves an import specifier to the file it names.
 *
 * @param fromFile - Importing file, repo-relative.
 * @param specifier - Relative specifier.
 * @returns The target's repo-relative path, or null when it can't be found.
 */
function resolveTarget(fromFile, specifier) {
	const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
	for (const extension of EXTENSIONS) {
		const candidate = base + extension;
		if (existsSync(candidate) && statSync(candidate).isFile()) {
			return { candidate, extension };
		}
	}
	return null;
}

/**
 * Builds a relative specifier from one file to another.
 *
 * @param fromFile - Importing file's new path.
 * @param target - Target's new path.
 * @param extension - Extension suffix the original specifier resolved with.
 * @returns The specifier, in the original's extension style.
 */
function buildSpecifier(fromFile, target, extension) {
	let withoutExtension = target;
	if (extension !== '' && target.endsWith(extension)) {
		withoutExtension = target.slice(0, -extension.length);
	}
	let relative = path.posix.relative(path.posix.dirname(fromFile), withoutExtension);
	if (!relative.startsWith('.')) {
		relative = './' + relative;
	}
	return relative;
}

const files = [...walk('src'), 'main.ts'].filter((file) => /\.(ts|tsx)$/.test(file));
const rewritten = new Map();

for (const file of files) {
	const newPath = moveMap.get(file) ?? file;
	const source = readFileSync(file, 'utf8');
	const updated = source.replace(SPECIFIER, (match, lead, quote, specifier) => {
		const resolved = resolveTarget(file, specifier);
		if (resolved === null) {
			return match;
		}
		const target = moveMap.get(resolved.candidate) ?? resolved.candidate;
		if (target === resolved.candidate && newPath === file) {
			return match;
		}
		return `${ lead }${ quote }${ buildSpecifier(newPath, target, resolved.extension) }${ quote }`;
	});
	rewritten.set(file, updated);
}

for (const [oldPath, newPath] of MOVES) {
	mkdirSync(path.dirname(newPath), { recursive: true });
	try {
		execFileSync('git', [
			'mv',
			oldPath,
			newPath
		], { stdio: 'pipe' });
	} catch {
		renameSync(oldPath, newPath);
	}
}

for (const [file, content] of rewritten) {
	writeFileSync(moveMap.get(file) ?? file, content);
}

console.log(`Moved ${ MOVES.length } files; checked ${ files.length } for imports.`);
