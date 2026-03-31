'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface GenrePillProps {
  id: number
  name: string
  href?: string
}

export default function GenrePill({ id, name, href }: GenrePillProps) {
  const linkHref = href || `/search?q=&genre=${id}`
  return (
    <Link href={linkHref}>
      <motion.div
        whileHover={{
          scale: 1.1,
          rotate: [0, -5, 5, -5, 5, 0],
          transition: { duration: 0.4 },
        }}
        whileTap={{ scale: 0.9 }}
        className="px-5 py-2.5 bg-slate-900 border shadow-md border-slate-700 rounded-full text-slate-300 text-sm font-semibold hover:bg-amber-600/80 hover:border-amber-500 hover:text-white cursor-pointer transition-colors whitespace-nowrap"
      >
        {name}
      </motion.div>
    </Link>
  )
}
