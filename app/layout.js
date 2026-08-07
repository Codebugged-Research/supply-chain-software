import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: "Vanco - AI S&OP Suite",
  description: 'Executive Supply & Operations Planning Platform',
  icons: {
    icon: '/vanco-only-logo.png',
    shortcut: '/vanco-only-logo.png',
    apple: '/vanco-only-logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
