import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Params {
  params: { id: string }
}

async function getMangaDetails(id: string) {
  const res = await fetch(`https://api.jikan.moe/v4/manga/${id}/full`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('Failed to fetch details')
  const json = await res.json()
  return json.data
}

export async function generateMetadata({ params }: Params) {
  const manga = await getMangaDetails(params.id)
  return {
    title: `${manga.title} - ZynqToon Catalog`,
    description: manga.synopsis?.substring(0, 160) || 'View manga details on ZynqToon.',
  }
}

export default async function MangaDetail({ params }: Params) {
  const manga = await getMangaDetails(params.id)

  const image = manga.images?.webp?.large_image_url || manga.images?.jpg?.large_image_url
  const score = manga.score ? manga.score.toFixed(2) : 'N/A'
  const rank = manga.rank ? `#${manga.rank}` : 'Unranked'
  const authors = (manga.authors || []).map((a: any) => a.name).join(', ') || 'Unknown Author'
  const status = manga.status || 'Unknown'
  
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Back Button */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
            <ArrowLeft size={20} /> <span className="font-medium">Back to Catalog</span>
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16">
          
          {/* Cover Column */}
          <div className="w-full md:w-1/3 max-w-sm mx-auto md:mx-0 flex-shrink-0 relative group">
            <div className="absolute inset-0 bg-amber-600/20 blur-2xl rounded-3xl z-0 transform group-hover:scale-105 transition-transform duration-500" />
            <img 
              src={image} 
              alt={manga.title} 
              className="relative z-10 w-full h-auto rounded-2xl border border-slate-700 shadow-2xl object-cover"
            />
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-100 leading-tight mb-2 drop-shadow-lg">
                {manga.title}
              </h1>
              {manga.title_japanese && (
                <h2 className="text-xl md:text-2xl font-serif text-slate-400 font-medium">
                  {manga.title_japanese}
                </h2>
              )}
            </div>

            {/* Meta Tags */}
            <div className="flex flex-wrap gap-3">
              <span className="px-4 py-2 rounded-lg bg-slate-900 border border-amber-600/40 text-amber-200 font-bold shadow-sm">
                ★ {score}
              </span>
              <span className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-bold">
                👑 Rank {rank}
              </span>
              <span className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                {status}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-slate-400"><strong className="text-slate-300">Author(s):</strong> {authors}</p>
              <p className="text-slate-400"><strong className="text-slate-300">Published:</strong> {manga.published?.string || 'Unknown'}</p>
            </div>

            {/* Genres */}
            {manga.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                {manga.genres.map((g: any) => (
                  <Link key={g.mal_id} href={`/search?genre=${g.mal_id}`}>
                    <span className="px-3 py-1 bg-slate-800 hover:bg-amber-600 border border-slate-700 text-sm font-medium rounded-md cursor-pointer transition-colors text-slate-200 hover:text-white">
                      {g.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-slate-200">Synopsis</h3>
              <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: (manga.synopsis || 'No synopsis provided.').replace(/\n/g, '<br/>') }} />
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
