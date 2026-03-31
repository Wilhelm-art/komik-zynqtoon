'use client'

import { motion } from 'framer-motion'
import ComicCard from './ComicCard'

const containerVars = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

export default function ComicGrid({ items }: { items: any[] }) {
  if (!items || items.length === 0) return <div className="text-slate-500 text-center py-10">No manga available.</div>

  return (
    <motion.div 
      variants={containerVars}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6"
    >
      {items.map((manga) => (
        <ComicCard 
          key={manga.mal_id}
          id={manga.mal_id}
          title={manga.title}
          image={manga.images?.webp?.large_image_url || manga.images?.jpg?.large_image_url}
          score={manga.score ? manga.score.toFixed(1) : '—'}
          genres={(manga.genres || []).map((g: any) => g.name).slice(0, 2).join(', ')}
        />
      ))}
    </motion.div>
  )
}
