import "./globals.css";
import HashRedirect from "./HashRedirect";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HashRedirect />
        {children}
      </body>
    </html>
  );
}