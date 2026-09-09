import { Sarabun } from 'next/font/google'

const sarabun = Sarabun({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  variable: '--font-sarabun',
  display: 'swap'
})

export const fontClasses = `${sarabun.variable} ${sarabun.className}`
