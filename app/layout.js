import "./globals.css";

export const metadata = {
  title: "Exam Portal",
  description: "Secure online exam conducting platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-gray-900">{children}</body>
    </html>
  );
}
