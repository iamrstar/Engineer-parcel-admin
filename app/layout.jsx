import "./globals.css"
import { Toaster } from "react-hot-toast"

export const metadata = {
  title: "EngineersParcel Admin Dashboard",
  description: "Admin dashboard for EngineersParcel courier service",
    generator: 'v0.dev'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
