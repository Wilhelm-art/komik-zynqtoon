import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const execAsync = promisify(exec);

// Path Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COVERS_DIR = path.join(PUBLIC_DIR, 'assets', 'covers');
const JSON_FILE = path.join(PUBLIC_DIR, 'comics.json');

// Constants
const DELAY_MS = 10000; // 10 seconds between requests
const PUSH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

const MANGADEX_BASE = 'https://api.mangadex.org';
const TRENDING_URL = `${MANGADEX_BASE}/manga?limit=8&offset=0&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe`;
const LATEST_URL = `${MANGADEX_BASE}/manga?limit=10&offset=0&includes[]=cover_art&order[latestUploadedChapter]=desc&contentRating[]=safe`;

// Interfaces
interface Comic {
    id: string; // Internal id for tracking updates
    title: string;
    genre: string;
    rating: string;
    image: string; // The slugged .webp filename
    chapter: string;
    color: string;
}

interface ComicsData {
    trending: Comic[];
    newReleases: Comic[];
}

// Utility: Sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Generate SEO Slug
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// Utility: Random Rating
const getRandomRating = () => (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1);

// Utility: Random Gradient Color
const getRandomGradient = () => {
    const gradients = [
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "linear-gradient(135deg, #ff00cc 0%, #333399 100%)",
        "linear-gradient(135deg, #00F5D4 0%, #00b4db 100%)",
        "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
        "linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
};

async function logError(message: string, error?: any) {
    const logPath = path.join(__dirname, '..', 'error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = error?.message || String(error || '');
    const logEntry = `[${timestamp}] ${message} ${errorMessage}\n`;
    console.error(logEntry);
    await fs.appendFile(logPath, logEntry, 'utf8').catch(console.error);
}

async function fetchMangaData(url: string, categoryName: string): Promise<Comic[]> {
    console.log(`\nFetching ${categoryName} from MangaDex...`);
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'ZynqToonBot/1.0 (Integration)' },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        
        const mangaList = response.data.data || [];
        const results: Comic[] = [];

        for (const manga of mangaList) {
            const attr = manga.attributes;
            const title = attr.title.en || attr.title['ja-ro'] || attr.title[Object.keys(attr.title)[0]] || 'Unknown Title';
            
            // Extract Genre
            const genreTags = attr.tags.filter((t: any) => t.attributes.group === 'genre');
            const genre = genreTags.length > 0 ? genreTags[0].attributes.name.en : 'Action';
            
            // Extract Cover filename
            const coverRel = manga.relationships.find((r: any) => r.type === 'cover_art');
            let coverFileName = '';
            if (coverRel && coverRel.attributes && coverRel.attributes.fileName) {
                coverFileName = coverRel.attributes.fileName;
            } else if (coverRel) {
                // If relationships includes wasn't fully resolved locally, we'd have to fetch cover id but we used includes[]=cover_art
                // But let's assume attributes are present.
                coverFileName = coverRel.attributes?.fileName || '';
            }

            const chapter = attr.lastChapter || '1';
            const slug = slugify(title);
            const webpFileName = `${slug}.webp`;

            results.push({
                id: manga.id,
                title,
                genre,
                rating: getRandomRating(),
                image: `/assets/covers/${webpFileName}`,
                chapter,
                color: getRandomGradient(),
            });

            // Process image if coverFileName exists
            if (coverFileName) {
                const coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg`;
                await downloadAndOptimizeImage(coverUrl, webpFileName);
            }

            // Respect Rate Limit
            console.log(`Waiting ${DELAY_MS}ms to respect rate limits...`);
            await sleep(DELAY_MS);
        }

        return results;
    } catch (error: any) {
        await logError(`Failed to fetch ${url}`, error);
        return [];
    }
}

async function downloadAndOptimizeImage(url: string, webpFileName: string) {
    const outputPath = path.join(COVERS_DIR, webpFileName);
    
    // Check if file exists to save bandwidth
    try {
        await fs.access(outputPath);
        console.log(`Image ${webpFileName} already exists. Skipping download.`);
        return;
    } catch {
        // File doesn't exist, proceed to download
    }

    try {
        console.log(`Downloading cover: ${url}`);
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        
        console.log(`Optimizing image to ${webpFileName}...`);
        await sharp(response.data)
            .webp({ quality: 80 })
            .toFile(outputPath);
            
    } catch (error: any) {
        await logError(`Failed to download or optimize image: ${url}`, error);
    }
}

async function loadExistingComics(): Promise<ComicsData> {
    try {
        const data = await fs.readFile(JSON_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            await logError('Error reading comics.json', error);
        }
        // Default structure
        return { trending: [], newReleases: [] };
    }
}

async function saveComics(data: ComicsData) {
    await fs.writeFile(JSON_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function mergeComics(existing: Comic[], incoming: Comic[]): Comic[] {
    const list = [...existing];
    
    for (const newComic of incoming) {
        const index = list.findIndex(c => c.id === newComic.id);
        if (index >= 0) {
            // Check if chapter updated
            const existingChap = parseFloat(list[index].chapter) || 0;
            const newChap = parseFloat(newComic.chapter) || 0;
            if (newChap > existingChap || (!existingChap && newChap)) {
                console.log(`Updating ${newComic.title} to chapter ${newComic.chapter}`);
                list[index].chapter = newComic.chapter;
            }
        } else {
            console.log(`Adding new comic: ${newComic.title}`);
            list.push(newComic);
        }
    }
    return list;
}

async function runDeployCycle() {
    console.log(`\n=== Starting Autonomous Scraping Cycle at ${new Date().toISOString()} ===\n`);

    // 1. Fetch Data
    const trendingFetched = await fetchMangaData(TRENDING_URL, 'Trending');
    const newFetched = await fetchMangaData(LATEST_URL, 'Latest Releases');

    // 2. Load & Merge Data
    const db = await loadExistingComics();
    
    db.trending = mergeComics(db.trending, trendingFetched);
    db.newReleases = mergeComics(db.newReleases, newFetched);

    // 3. Ensure 'Trending' keeps only top 8 highest-rated
    db.trending.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    db.trending = db.trending.slice(0, 8);
    
    // Sort new releases by chapter or date (we'll just slice top 10 for neatness)
    db.newReleases = db.newReleases.slice(-10).reverse();

    await saveComics(db);
    console.log('\nComics database updated successfully.');

    // 4. Git Automation
    try {
        console.log('\nStarting Git synchronization...');
        await execAsync('git config http.sslVerify "false"'); // To avoid local path issues if present
        await execAsync('git branch -M main');
        await execAsync('git add .');
        
        const timestamp = new Date().toISOString();
        const commitMsg = `Auto-update: Synced MangaDex via Anti Gravity AI (${timestamp})`;
        const updatedCount = trendingFetched.length + newFetched.length;
        
        try {
            await execAsync(`git commit -m "${commitMsg}"`);
            
            try {
                await execAsync('git push origin main');
            } catch (pushErr: any) {
                const pMsg = (pushErr.message || '') + (pushErr.stdout || '') + (pushErr.stderr || '');
                if (pMsg.includes('rejected') || pMsg.includes('non-fast-forward') || pMsg.includes('fetch first')) {
                    console.log('Push rejected. Attempting auto-resolution (pull --rebase)...');
                    try {
                        await execAsync('git pull origin main --rebase');
                        await execAsync('git push origin main');
                    } catch (rebaseErr: any) {
                        console.log('Conflicts persist. Prioritizing LOCAL files...');
                        await execAsync('git push origin main --force');
                    }
                } else {
                    throw pushErr;
                }
            }
            
            await fs.appendFile(path.join(__dirname, '..', 'deployment_log.txt'), `[${timestamp}] Sync successful. Processed ${updatedCount} comics.\n`, 'utf8');
            console.log(`Deployed to GitHub successfully!`);
        } catch (commitErr: any) {
            const errMsg = (commitErr.message || '') + (commitErr.stdout || '') + (commitErr.stderr || '');
            if (errMsg.includes('nothing to commit') || errMsg.includes('clean')) {
                console.log('No new changes to commit.');
            } else {
                throw commitErr;
            }
        }
    } catch (gitErr: any) {
        await logError('Git automation failed', gitErr);
    }
    
    console.log(`\n=== Cycle Complete. Next run in 6 hours. ===\n`);
}

// Start immediately, then assign to interval
runDeployCycle().then(() => {
    setInterval(runDeployCycle, PUSH_INTERVAL);
});
