import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import PWAManager from '@/components/PWAManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import ServiceWorkerManager from '@/components/ServiceWorkerManager'

export const metadata = {
  title: "TruckSuperSoftware",
  description: 'Fleet management for owner-operators and small fleets. Dispatch, tracking, compliance, and financials in one app.',
  manifest: '/manifest.json',
  themeColor: '#2D7A5F',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TruckSuper',
  },
  icons: {
    apple: '/icon-192.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <PWAManager />
          <ServiceWorkerManager />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </LanguageProvider>
      </body>
    </html>
  )
}
