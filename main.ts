// Dusk Murmuration — the entry program (Node 22, standard library only).
// It hands the game in: copies this repository's game/ and screenshots/
// beside it into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. The game itself is plain static files —
// game/index.html and its ES modules, no library, no network request.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));

const shotsIn = join(repoRoot, 'screenshots');
const shotsOut = join(outputDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
if (existsSync(shotsIn)) copyTree(shotsIn, shotsOut);

// The scorer's own caps: only text_max_bytes shapes the dossier's bytes;
// the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files in all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const gameFiles = readdirSync(join(outputDir, 'game'), { recursive: true }).length;
const shotFiles = readdirSync(shotsOut).filter((f) => !f.startsWith('.'));
console.log(`dusk-murmuration: ${gameFiles} game entries, ${shotFiles.length} screenshots, dossier ${dossier.length} bytes -> ${outputDir}`);
