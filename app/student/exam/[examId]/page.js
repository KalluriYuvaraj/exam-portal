"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuth } from "@/lib/clientAuth";
import { usePreventCheating } from "@/hooks/usePreventCheating";
import { useTabSwitchDetection } from "@/hooks/useTabSwitchDetection";

export default function TakeExamPage() {
  const { examId } = useParams();
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: selectedAnswer }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null); // seconds
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [warningBanner, setWarningBanner] = useState("");

  const submittedRef = useRef(false); // guards against double-submit

  // Block copy/paste/right-click while exam is active and not yet submitted
  usePreventCheating(!submitted);

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;

      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "submit", examId, autoSubmitted }),
        });
        const data = await res.json();
        setSubmitted(true);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (autoSubmitted) {
          setWarningBanner("Your exam was auto-submitted due to repeated tab-switch violations.");
        }
      } catch (err) {
        console.error(err);
      }
    },
    [examId, token]
  );

  // Tab-switch detection — auto-submits once max warnings exceeded
  const warningCount = useTabSwitchDetection({
    examId,
    token,
    maxWarnings: exam?.settings?.maxTabSwitchWarnings ?? 3,
    onMaxExceeded: () => handleSubmit(true),
    active: !!exam && !submitted,
  });

  // Load auth + exam + start/resume attempt
  useEffect(() => {
    const { token: t, user } = getAuth();
    if (!t || user?.role !== "student") {
      router.push("/student/login");
      return;
    }
    setToken(t);
    initExam(t);
  }, []);

  const initExam = async (t) => {
    try {
      const examRes = await fetch(`/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const examData = await examRes.json();
      if (!examRes.ok) throw new Error(examData.error);
      setExam(examData.exam);

      const startRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ action: "start", examId }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error);
      setSubmission(startData.submission);

      if (startData.submission.status === "submitted") {
        setSubmitted(true);
      } else {
        // Restore previously saved answers
        const restored = {};
        for (const a of startData.submission.answers) {
          restored[a.questionId] = a.selectedAnswer;
        }
        setAnswers(restored);

        // Compute remaining time server-authoritatively
        const startedAt = new Date(startData.submission.startedAt).getTime();
        const durationMs = examData.exam.duration * 60 * 1000;
        const remainingMs = startedAt + durationMs - Date.now();
        setTimeLeft(Math.max(0, Math.floor(remainingMs / 1000)));

        // Try to enter fullscreen (best-effort, browsers may block without user gesture)
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft === null, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAnswer = async (questionId, selectedAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedAnswer }));
    try {
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "save_answer", examId, questionId, selectedAnswer }),
      });
    } catch (err) {
      console.error("Failed to save answer", err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) return <p className="p-6">Loading exam...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  if (submitted) {
    return (
      <main className="max-w-xl mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Exam Submitted</h1>
        {warningBanner && <p className="text-red-600 mb-4">{warningBanner}</p>}
        <p className="text-gray-600 mb-6">Your responses have been recorded.</p>
        <button
          onClick={() => router.push("/student/dashboard")}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg"
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  const question = exam.questions[currentIndex];

  return (
    <main className="max-w-3xl mx-auto p-6 select-none">
      {/* Warning banner for tab switches */}
      {warningCount > 0 && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          ⚠️ Warning {warningCount}/{exam.settings.maxTabSwitchWarnings}: Tab switching detected.
          Exam will auto-submit if this continues.
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <div className="text-lg font-mono bg-gray-900 text-white px-4 py-1.5 rounded-lg">
          {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border mb-4">
        <p className="text-sm text-gray-500 mb-2">
          Question {currentIndex + 1} of {exam.questions.length}
        </p>
        <p className="text-lg font-medium mb-4">{question.questionText}</p>

        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label
              key={i}
              className={`block border rounded-lg px-4 py-2 cursor-pointer ${
                answers[question._id] === opt ? "border-blue-600 bg-blue-50" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name={`q-${question._id}`}
                checked={answers[question._id] === opt}
                onChange={() => saveAnswer(question._id, opt)}
                className="mr-2"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="px-4 py-2 border rounded-lg disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex gap-2 flex-wrap justify-center">
          {exam.questions.map((q, i) => (
            <button
              key={q._id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full text-sm border ${
                i === currentIndex
                  ? "bg-gray-900 text-white"
                  : answers[q._id]
                  ? "bg-green-100 border-green-400"
                  : "bg-white"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentIndex < exam.questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="px-4 py-2 border rounded-lg"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => {
              if (confirm("Submit the exam? You cannot change answers after this.")) {
                handleSubmit(false);
              }
            }}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
          >
            Submit Exam
          </button>
        )}
      </div>
    </main>
  );
}
