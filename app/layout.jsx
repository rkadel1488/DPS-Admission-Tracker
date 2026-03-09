// Standard Next.js layout structure
// Note: next/font/google is removed for preview compatibility,
// but can be re-added in your local Next.js environment.

export const metadata = {
  title: "DPS Admission Tracker",
  description: "Internal admission tracking system for Delhi Public School",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-inter: 'Inter', sans-serif;
          }
          body {
            font-family: var(--font-inter);
            margin: 0;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
