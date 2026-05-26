import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Lava Mobiles S&OP Suite | Enterprise Planning',
  description: 'Sales and operations planning workspace tailored for Lava Mobiles demo scenarios.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
