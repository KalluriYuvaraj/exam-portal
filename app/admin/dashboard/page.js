"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/clientAuth";

export default function AdminDashboard() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const { token, user } = getAuth();
    if (!token || user?.role !== "admin") {
      router.push("/admin/login");
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
    router.push("/admin/login");
  };

  const togglePublish = async (exam) => {
    const { token } = getAuth();
    const res = await fetch(`/api/exams/${exam._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isPublished: !exam.isPublished }),
    });
    if (res.ok) {
      setExams((prev) =>
        prev.map((e) => (e._id === exam._id ? { ...e, isPublished: !e.isPublished } : e))
      );
    }
  };

  const deleteExam = async (examId) => {
    if (!confirm("Delete this exam? This cannot be undone.")) return;
    const { token } = getAuth();
    const res = await fetch(`/api/exams/${examId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setExams((prev) => prev.filter((e) => e._id !== examId));
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/exams/create"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            + Create Exam
          </Link>
          <button onClick={handleLogout} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Logout
          </button>
        </div>
      </div>

      {loading && <p>Loading exams...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid gap-4">
        {exams.map((exam) => (
          <div key={exam._id} className="bg-white p-5 rounded-xl shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{exam.title}</h2>
                <p className="text-sm text-gray-500">
                  {exam.questions.length} questions · {exam.duration} min ·{" "}
                  {new Date(exam.startTime).toLocaleString()}
                </p>
                <span
                  className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                    exam.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {exam.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Link
                  href={`/admin/exams/${exam._id}`}
                  className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                >
                  Manage
                </Link>
                <button
                  onClick={() => togglePublish(exam)}
                  className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                >
                  {exam.isPublished ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => deleteExam(exam._id)}
                  className="text-sm px-3 py-1.5 border rounded-lg text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && exams.length === 0 && (
          <p className="text-gray-500">No exams yet. Create your first one.</p>
        )}
      </div>
    </main>
  );
}
