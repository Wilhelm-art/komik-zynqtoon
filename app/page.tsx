import ComicGrid from '../components/ComicGrid'
import GenrePill from '../components/GenrePill'
import { Search } from 'lucide-react'

// Next.js static revalidation config (1 hour cache)
export const revalidate = 3600

async function getTopManga() {
  const res = await fetch('https://api.jikan.moe/v4/top/manga?filter=bypopularity&limit=12')
  if (!res.ok) return []
  const json = await res.json()
  return json.data || []
}

async function getNewReleases() {
  const res = await fetch('https://api.jikan.moe/v4/top/manga?filter=publishing&limit=12')
  if (!res.ok) return []
  const json = await res.json()
  return json.data || []
}

export default async function Home() {
  const trending = await getTopManga()
  const newReleases = await getNewReleases()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 z-0" />
        
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold font-serif leading-tight drop-shadow-xl">
            Discover Your Next <span className="text-amber-500 italic">Obsession</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto drop-shadow-md">
            The premium catalog database for manga enthusiasts. Explore thousands of titles, track your favorites, and dive into curated collections.
          </p>
          
          <div className="mt-8 flex items-center justify-center">
            <form action="/search" className="relative w-full max-w-md">
              <input 
                type="text" 
                name="q"
                placeholder="Search for manga, artists, characters..." 
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-full py-4 pl-6 pr-14 text-slate-200 focus:outline-none focus:border-amber-500/50 transition-colors shadow-2xl"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-800 hover:bg-amber-600 rounded-full transition-colors text-slate-300 hover:text-white">
                <Search size={20} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 space-y-24 z-10 relative">
        
        {/* Trending */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-serif font-bold tracking-tight">Trending Now</h2>
          </div>
          <ComicGrid items={trending} />
        </section>

        {/* Categories */}
        <section className="py-16 border-y border-slate-800/50">
          <h2 className="text-2xl font-serif font-bold mb-8 text-center text-slate-300">Browse by Genre</h2>
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            <GenrePill id={1} name="Action" />
            <GenrePill id={2} name="Adventure" />
            <GenrePill id={4} name="Comedy" />
            <GenrePill id={8} name="Drama" />
            <GenrePill id={10} name="Fantasy" />
            <GenrePill id={14} name="Horror" />
            <GenrePill id={22} name="Romance" />
            <GenrePill id={24} name="Sci-Fi" />
            <GenrePill id={36} name="Slice of Life" />
          </div>
        </section>

        {/* Publishing Now */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-serif font-bold tracking-tight">Publishing Highlights</h2>
          </div>
          <ComicGrid items={newReleases} />
        </section>

      </main>
    </div>
  )
}
