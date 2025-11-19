'use client'

import { WebViewRPCProvider } from '@webviewrpc/web'
import { contract } from '@example/contract'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <WebViewRPCProvider contract={contract}>
          {children}
        </WebViewRPCProvider>
      </body>
    </html>
  )
}
