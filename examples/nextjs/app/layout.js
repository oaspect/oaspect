import "@oaspect/react/styles.css";

export const metadata = { title: "Bookstore API" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
