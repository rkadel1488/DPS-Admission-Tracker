// Standard Next.js layout structure
// The globals.css import is required for Tailwind to function in a Next.js project

import './globals.css';

export const metadata = {
  title: 'DPS Admission Tracker',
  description: 'Internal admission tracking system for Delhi Public School',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
