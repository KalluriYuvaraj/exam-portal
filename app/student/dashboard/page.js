"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/clientAuth";

export default function StudentDashboard() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const { token, user } = getAuth();
    if (!token || user?.role !== "student") {
      router.push("/student/login");
      return;
    }
    fetchExams(token);
  }, []);

  const fetchExams = async (token) => {
    try {
      const res = await fetch("/api/exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExams(data.exams);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/student/login");
  };

  const examStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    if (now < start) return "upcoming";
    if (now > end) return "closed";
    return "live";
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Available Exams</h1>
        <button onClick={handleLogout} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
          Logout
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid gap-4">
        {exams.map((exam) => {
          const status = examStatus(exam);
          return (
            <div key={exam._id} className="bg-white p-5 rounded-xl shadow-sm border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{exam.title}</h2>
                <p className="text-sm text-gray-500">
                  {exam.questions.length} questions · {exam.duration} min
                </p>
                <p className="text-sm text-gray-400">
                  {new Date(exam.startTime).toLocaleString()} — {new Date(exam.endTime).toLocaleString()}
                </p>
              </div>
              {status === "live" && (
                <Link
                  href={`/student/exam/${exam._id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500"
                >
                  Start Exam
                </Link>
              )}
              {status === "upcoming" && (
                <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg">
                  Not started yet
                </span>
              )}
              {status === "closed" && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                  Closed
                </span>
              )}
            </div>
          );
        })}
        {!loading && exams.length === 0 && (
          <p className="text-gray-500">No exams available right now.</p>
        )}
      </div>
    </main>
  );
}
