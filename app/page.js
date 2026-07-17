import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl font-bold">Exam Portal</h1>
      <p className="text-gray-600">Secure online exam platform</p>
      <div className="flex gap-4">
        <Link
          href="/admin/login"
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-700"
        >
          Admin Login
        </Link>
        <Link
          href="/student/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
        >
          Student Login
        </Link>
      </div>
    </main>
  );
}
