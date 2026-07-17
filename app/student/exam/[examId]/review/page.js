"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "@/lib/clientAuth";

export default function ExamReviewPage() {
  const { examId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const { token, user } = getAuth();
    if (!token || user?.role !== "student") {
      router.push("/student/login");
      return;
    }
    loadReview(token);
  }, [examId]);

  const loadReview = async (token) => {
    try {
      const res = await fetch(`/api/exams/${examId}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not load results");
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <main className="max-w-3xl mx-auto p-6">Loading...</main>;

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => router.push("/student/dashboard")}
          className="mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  const { exam, questions, score, totalMarks, submittedAt, autoSubmitted } = data;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{exam.title} — Results</h1>
        <p className="text-gray-500 text-sm mt-1">
          Submitted {new Date(submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          {autoSubmitted && " (auto-submitted)"}
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <p className="text-3xl font-bold">
          {score} <span className="text-gray-400 text-lg font-normal">/ {totalMarks}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">Your score</p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div
            key={q._id}
            className={`bg-white p-5 rounded-xl shadow-sm border-2 ${
              q.isCorrect ? "border-green-200" : "border-red-200"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-medium">
                {i + 1}. {q.questionText}
              </p>
              <span
                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-3 ${
                  q.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {q.isCorrect ? `Correct (+${q.marks})` : "Incorrect"}
              </span>
            </div>

            {q.questionType === "fill_blank" ? (
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Your answer: </span>
                  {q.selectedAnswers[0] || <em className="text-gray-400">No answer</em>}
                </p>
                <p>
                  <span className="text-gray-500">Correct answer: </span>
                  {q.correctAnswers.join(" / ")}
                </p>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {q.options.map((opt, idx) => {
                  const wasSelected = q.selectedAnswers.includes(opt);
                  const isRight = q.correctAnswers.includes(opt);
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg border ${
                        isRight
                          ? "border-green-300 bg-green-50"
                          : wasSelected
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      {opt}
                      {isRight && <span className="text-green-600 text-xs ml-2">✓ correct</span>}
                      {wasSelected && !isRight && (
                        <span className="text-red-600 text-xs ml-2">your answer</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/student/dashboard")}
        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        Back to dashboard
      </button>
    </main>
  );
}