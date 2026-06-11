import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import PWAManager from '@/components/PWAManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import ServiceWorkerManager from '@/components/ServiceWorkerManager'

export const metadata = {
  title: "Smith's Freight Hub",
  description: 'Fleet Management Platform',
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
