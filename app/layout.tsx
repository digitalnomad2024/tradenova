import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var hash = window.location.hash.replace('#', '').replace('/', '');
                var allowed = ['trade', 'dashboard', 'login', 'checkout', 'forgot-password'];
                if (hash && allowed.indexOf(hash) !== -1) {
                  window.location.replace('/' + hash);
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}