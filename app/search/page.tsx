import { SearchIcon, Home } from 'lucide-react'
import Link from 'next/link'
import ComicGrid from '../../components/ComicGrid'

interface SearchProps {
  searchParams: {
    q?: string
    genre?: string
  }
}

async function fetchSearchResults(query: string, genre: string) {
  let url = 'https://api.jikan.moe/v4/manga?sfw=true&sort=desc&limit=24'
  if (query) url += `&q=${encodeURIComponent(query)}`
  if (genre) url += `&genres=${genre}&order_by=score`
  
  // Use a short revalidate for search since it changes often
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const json = await res.json()
  return json.data || []
}

export const metadata = {
  title: 'Search - ZynqToon',
  description: 'Search for manga on ZynqToon.',
}

export default async function Search({ searchParams }: SearchProps) {
  const query = searchParams.q || ''
  const genre = searchParams.genre || ''
  
  const results = await fetchSearchResults(query, genre)

  return (
    <div className="min-h-screen flex flex-col pt-12">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-7xl mx-auto px-6 mb-8 flex justify-between items-center">
        <Link href="/" className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 font-bold decoration-amber-500 hover:underline">
          <Home size={20} /> Back Home
        </Link>
        
        <form action="/search" className="relative w-full max-w-md ml-4">
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Search manga..." 
            className="w-full bg-slate-900 border-2 border-slate-800 rounded-lg py-2 pl-4 pr-10 text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500">
            <SearchIcon size={18} />
          </button>
        </form>
      </div>

      {/* Title */}
      <div className="w-full max-w-7xl mx-auto px-6 mb-12">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-100">
          {query ? `Search Results for "${query}"` : genre ? 'Genre Results' : 'Explore Manga'}
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Found {results.length} results</p>
      </div>

      {/* Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pb-20">
        <ComicGrid items={results} />
      </main>
    </div>
  )
}
