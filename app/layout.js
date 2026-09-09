import "./globals.css";

export const metadata = {
  title: "GY Power Watch",
  description: "Live power outage tracker for Guyana — outages, planned shutdowns and maintenance from GPL sources.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#009e49",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Montserrat:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
