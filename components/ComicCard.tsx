'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Eye } from 'lucide-react'

interface ComicCardProps {
  id: number
  title: string
  image: string
  score: string | number
  genres: string
}

export default function ComicCard({ id, title, image, score, genres }: ComicCardProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ type: 'spring', damping: 15 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {/* Glassmorphism shine on hover */}
        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-white/0 via-white/0 to-white/0 group-hover:via-white/5 transition-all duration-500 pointer-events-none" />
        
        <img 
          src={image || 'https://via.placeholder.com/300x400?text=No+Image'} 
          alt={title} 
          className="object-cover w-full h-full"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
        
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-md border border-slate-700/50">
          <span className="text-xs font-bold text-amber-100">★ {score}</span>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow z-20 -mt-10">
        <span className="text-xs font-semibold text-slate-400 mb-1 truncate">{genres}</span>
        <h3 className="font-serif text-lg font-bold text-slate-100 line-clamp-2 mb-4 drop-shadow-md">
          {title}
        </h3>
        
        <div className="mt-auto">
          <Link href={`/manga/${id}`}>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-amber-600/80 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors duration-300 font-medium text-sm"
            >
              <Eye size={16} /> View Details
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
