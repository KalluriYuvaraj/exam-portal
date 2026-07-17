"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "@/lib/clientAuth";

export default function ExamManagePage() {
  const { examId } = useParams();
  const router = useRouter();
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const { token, user } = getAuth();
    if (!token || user?.role !== "admin") {
      router.push("/admin/login");
      return;
    }
    loadData(token);
  }, [examId]);

  const loadData = async (token) => {
    try {
      const [examRes, subsRes] = await Promise.all([
        fetch(`/api/exams/${examId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/submissions?examId=${examId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const examData = await examRes.json();
      const subsData = await subsRes.json();
      if (!examRes.ok) throw new Error(examData.error);
      setExam(examData.exam);
      setSubmissions(subsData.submissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalMarks = exam?.questions?.reduce((sum, q) => sum + q.marks, 0) || 0;

  return (
    <main className="max-w-4xl mx-auto p-6">
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {exam && (
        <>
          <h1 className="text-2xl font-bold mb-1">{exam.title}</h1>
          <p className="text-gray-500 mb-6">
            {exam.questions.length} questions · Total marks: {totalMarks} · Duration: {exam.duration} min
          </p>

          <h2 className="text-lg font-semibold mb-3">Submissions ({submissions.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Tab-switch violations</th>
                  <th className="p-3">Auto-submitted?</th>
                  <th className="p-3">Submitted at</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="p-3">
                      {s.studentId?.name} <br />
                      <span className="text-gray-400 text-xs">{s.studentId?.email}</span>
                    </td>
                    <td className="p-3">{s.status}</td>
                    <td className="p-3">
                      {s.score !== null ? `${s.score} / ${totalMarks}` : "-"}
                    </td>
                    <td className="p-3">
                      {s.violations.filter((v) => v.type === "tab_switch").length}
                    </td>
                    <td className="p-3">{s.autoSubmitted ? "Yes" : "No"}</td>
                    <td className="p-3">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-gray-500 text-center">
                      No submissions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
