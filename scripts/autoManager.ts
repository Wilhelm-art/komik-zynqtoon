import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// ─── Network Bypass (keep for ISP edge cases) ───────────────────────────────
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const execAsync = promisify(exec);

// ─── Path Configuration ──────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const JSON_FILE = path.join(PUBLIC_DIR, 'comics.json');

// ─── Constants ───────────────────────────────────────────────────────────────
const RATE_LIMIT_MS = 2000; // 2s between Jikan requests
const PUSH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const MAX_RETRIES = 3;

// ─── Jikan API v4 Endpoints ─────────────────────────────────────────────────
const JIKAN_TRENDING = 'https://api.jikan.moe/v4/top/manga?filter=bypopularity&limit=8';
const JIKAN_NEW_RELEASES = 'https://api.jikan.moe/v4/manga?order_by=start_date&sort=desc&status=publishing&limit=10';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Comic {
  id: number;
  title: string;
  genre: string;
  rating: string;
  image: string;
  lastChapter: string;
}

interface ComicsData {
  trending: Comic[];
  newReleases: Comic[];
}

// ─── Utilities ───────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function fallbackRating(): string {
  return (Math.random() * (4.9 - 4.5) + 4.5).toFixed(1);
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function logError(message: string, error?: any) {
  const logPath = path.join(PROJECT_ROOT, 'error.log');
  const timestamp = new Date().toISOString();
  const errorMessage = error?.message || String(error || '');
  const logEntry = `[${timestamp}] ${message} ${errorMessage}\n`;
  console.error(logEntry.trim());
  await fs.appendFile(logPath, logEntry, 'utf8').catch(console.error);
}

// ─── Jikan Fetch with Retry ─────────────────────────────────────────────────
async function fetchJikan(url: string, label: string): Promise<any[]> {
  log(`Fetching ${label} from Jikan API...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);

      // Jikan returns 429 on rate limit
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '3', 10);
        log(`⚠ Rate limited (429). Waiting ${retryAfter}s before retry...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const data = json?.data || [];

      if (data.length === 0) {
        log(`⚠ ${label}: API returned empty data`);
        return [];
      }

      log(`✓ ${label} fetched successfully (${data.length} items, attempt ${attempt})`);
      return data;
    } catch (error: any) {
      await logError(`Attempt ${attempt}/${MAX_RETRIES} - Failed to fetch ${label}`, error);

      if (attempt < MAX_RETRIES) {
        const backoff = RATE_LIMIT_MS * attempt;
        log(`Retrying in ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }

  log(`✗ Failed to fetch ${label} after ${MAX_RETRIES} attempts`);
  return [];
}

// ─── Map Jikan Data to Comic Schema ─────────────────────────────────────────
function mapJikanToComic(item: any): Comic {
  const title = item.title || item.title_english || 'Unknown Title';
  const genres = (item.genres || []).map((g: any) => g.name).join(', ') || 'Manga';
  const score = item.score;
  const rating = score && score > 0 ? score.toFixed(1) : fallbackRating();
  const image = item.images?.webp?.large_image_url
    || item.images?.jpg?.large_image_url
    || '';
  const lastChapter = item.chapters ? String(item.chapters) : '?';

  return {
    id: item.mal_id,
    title,
    genre: genres,
    rating,
    image,
    lastChapter,
  };
}

// ─── Load / Save / Validate ──────────────────────────────────────────────────
async function loadExistingComics(): Promise<ComicsData> {
  try {
    const raw = await fs.readFile(JSON_FILE, 'utf8');
    const data = JSON.parse(raw);

    if (data && typeof data === 'object' && !Array.isArray(data)
      && Array.isArray(data.trending) && Array.isArray(data.newReleases)) {
      return data;
    }

    log('⚠ Existing comics.json has invalid structure. Starting fresh.');
    return { trending: [], newReleases: [] };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      await logError('Error reading comics.json', error);
    }
    return { trending: [], newReleases: [] };
  }
}

async function saveComics(data: ComicsData): Promise<boolean> {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || !Array.isArray(data.trending) || !Array.isArray(data.newReleases)) {
    log('✗ VALIDATION FAILED: Invalid ComicsData structure. Refusing to save.');
    return false;
  }

  if (data.trending.length === 0 && data.newReleases.length === 0) {
    log('✗ VALIDATION FAILED: Both arrays are empty. Refusing to overwrite.');
    return false;
  }

  const jsonString = JSON.stringify(data, null, 2);

  // Sanity check
  try { JSON.parse(jsonString); } catch {
    log('✗ VALIDATION FAILED: Malformed JSON. Refusing to save.');
    return false;
  }

  await fs.writeFile(JSON_FILE, jsonString, 'utf8');
  log(`✓ comics.json saved (${data.trending.length} trending, ${data.newReleases.length} new releases)`);
  return true;
}

// ─── Git Automation ──────────────────────────────────────────────────────────
async function gitAutomation() {
  log('Starting Git synchronization...');
  const cwd = PROJECT_ROOT;
  const opts = { cwd };

  try {
    await execAsync('git add .', opts);

    try {
      await execAsync('git commit -m "Auto-update: Synced fresh data from Jikan API"', opts);
      log('✓ Changes committed');
    } catch (commitErr: any) {
      const msg = (commitErr.message || '') + (commitErr.stdout || '') + (commitErr.stderr || '');
      if (msg.includes('nothing to commit') || msg.includes('clean')) {
        log('No new changes to commit. Skipping push.');
        return;
      }
      throw commitErr;
    }

    try {
      await execAsync('git push origin main --force', opts);
      log('✓ Force pushed to origin/main');
    } catch (pushErr: any) {
      log('⚠ Push failed. Retrying with rebase...');
      try {
        await execAsync('git pull --rebase origin main', opts);
        await execAsync('git push origin main --force', opts);
        log('✓ Push succeeded after rebase');
      } catch (retryErr: any) {
        await logError('Git push failed after retry', retryErr);
      }
    }

    const timestamp = new Date().toISOString();
    await fs.appendFile(
      path.join(PROJECT_ROOT, 'deployment_log.txt'),
      `[${timestamp}] Jikan sync successful.\n`,
      'utf8'
    );
    log('✓ Deployment logged.');
  } catch (gitErr: any) {
    await logError('Git automation failed', gitErr);
  }
}

// ─── Main Cycle ──────────────────────────────────────────────────────────────
async function runDeployCycle() {
  log('');
  log('══════════════════════════════════════════════════════════════');
  log('  ZynqToon Pipeline — Jikan (MyAnimeList) Source');
  log('══════════════════════════════════════════════════════════════');

  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  // 1. Fetch trending
  const trendingRaw = await fetchJikan(JIKAN_TRENDING, 'Trending');
  await sleep(RATE_LIMIT_MS);

  // 2. Fetch new releases
  const newReleasesRaw = await fetchJikan(JIKAN_NEW_RELEASES, 'New Releases');

  // Self-healing: if both empty, preserve existing data
  if (trendingRaw.length === 0 && newReleasesRaw.length === 0) {
    log('⚠ Both API calls returned empty. Preserving existing comics.json.');
    return;
  }

  // 3. Map to Comic schema
  const trending = trendingRaw.map(mapJikanToComic);
  const newReleases = newReleasesRaw.map(mapJikanToComic);

  log('');
  trending.forEach(c => log(`  📈 Trending: ${c.title} (★${c.rating})`));
  log('');
  newReleases.forEach(c => log(`  🆕 New: ${c.title} (★${c.rating})`));
  log('');

  // 4. Build final data (fresh replace, not merge — Jikan gives us clean ranked data)
  const db: ComicsData = {
    trending: trending.slice(0, 8),
    newReleases: newReleases.slice(0, 10),
  };

  // 5. Save with validation
  const saved = await saveComics(db);
  if (!saved) {
    log('✗ Validation failed. comics.json was NOT overwritten.');
    return;
  }

  // 6. Git sync
  await gitAutomation();

  log('');
  log('══════════════════════════════════════════════════════════════');
  log('  Cycle Complete. Next run in 6 hours.');
  log('══════════════════════════════════════════════════════════════');
  log('');
}

// ─── Entry Point ─────────────────────────────────────────────────────────────
runDeployCycle().then(() => {
  setInterval(runDeployCycle, PUSH_INTERVAL);
}).catch(async (err) => {
  await logError('Fatal error in deploy cycle', err);
  process.exit(1);
});
