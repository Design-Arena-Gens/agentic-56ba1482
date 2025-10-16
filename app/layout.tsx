import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Minecraft Clone - Web Game',
  description: 'A fully functional Minecraft-inspired web game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
