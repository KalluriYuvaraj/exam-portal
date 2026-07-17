"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/clientAuth";

const emptyQuestion = () => ({
  questionText: "",
  questionType: "single", // "single" | "multiple" | "fill_blank"
  options: ["", "", "", ""],
  correctAnswers: [],
  marks: 1,
});

export default function CreateExamPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration: 30,
    startTime: "",
    endTime: "",
    questions: [emptyQuestion()],
    settings: {
      shuffleQuestions: false,
      maxTabSwitchWarnings: 3,
      disableCopyPaste: true,
      showResultsToStudents: false,
    },
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- AI question generation state ---
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiWarnings, setAiWarnings] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const handleUploadPDF = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadMessage("");
    try {
      const { token } = getAuth();
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/admin/rag-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadMessage(`Ingested "${uploadFile.name}" successfully. You can now generate questions from it.`);
    } catch (err) {
      setUploadMessage(`Error: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Enter a topic or instructions for the AI first.");
      return;
    }
    setAiError("");
    setAiWarnings([]);
    setAiLoading(true);
    try {
      const { token } = getAuth();
      const res = await fetch("/api/admin/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topicPrompt: aiPrompt,
          numQuestions: aiNumQuestions,
          difficulty: aiDifficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Question generation failed");

      // The RAG service returns { questionText, options, correctAnswer, marks }.
      // Map that into this app's actual schema: questionType "single" + correctAnswers array.
      const mapped = data.questions.map((q) => ({
        questionText: q.questionText,
        questionType: "single",
        options: q.options,
        correctAnswers: [q.correctAnswer],
        marks: q.marks || 1,
      }));

      setForm((prev) => {
        const isUntouched =
          prev.questions.length === 1 && !prev.questions[0].questionText.trim();
        const existing = isUntouched ? [] : prev.questions;
        return { ...prev, questions: [...existing, ...mapped] };
      });

      if (data.warnings?.length) setAiWarnings(data.warnings);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...form.questions];
    updated[index][field] = value;
    // Reset correctAnswers when switching question type to avoid stale/invalid data
    if (field === "questionType") {
      updated[index].correctAnswers = [];
      if (value === "fill_blank") updated[index].options = [];
      else if (updated[index].options.length === 0) updated[index].options = ["", "", "", ""];
    }
    setForm({ ...form, questions: updated });
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...form.questions];
    updated[qIndex].options[optIndex] = value;
    setForm({ ...form, questions: updated });
  };

  const toggleCorrectAnswer = (qIndex, optValue) => {
    const updated = [...form.questions];
    const q = updated[qIndex];
    if (q.questionType === "single") {
      q.correctAnswers = [optValue];
    } else {
      const has = q.correctAnswers.includes(optValue);
      q.correctAnswers = has
        ? q.correctAnswers.filter((a) => a !== optValue)
        : [...q.correctAnswers, optValue];
    }
    setForm({ ...form, questions: updated });
  };

  const updateFillBlankAnswers = (qIndex, value) => {
    // Comma-separated list of acceptable answers
    const updated = [...form.questions];
    updated[qIndex].correctAnswers = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setForm({ ...form, questions: updated });
  };

  const addQuestion = () => {
    setForm({ ...form, questions: [...form.questions, emptyQuestion()] });
  };

  const removeQuestion = (index) => {
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    for (const [i, q] of form.questions.entries()) {
      if (!q.questionText.trim()) {
        setError(`Question ${i + 1}: question text is required`);
        return;
      }
      if (q.questionType === "fill_blank") {
        if (q.correctAnswers.length === 0) {
          setError(`Question ${i + 1}: provide at least one acceptable answer`);
          return;
        }
      } else {
        if (q.options.some((o) => !o.trim())) {
          setError(`Question ${i + 1}: all options must be filled in`);
          return;
        }
        if (q.correctAnswers.length === 0) {
          setError(`Question ${i + 1}: select at least one correct answer`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const { token } = getAuth();
      const payload = {
        ...form,
        // Convert the browser's local wall-clock time into an unambiguous UTC
        // instant, so the stored time is correct regardless of server timezone.
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      };
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create exam");
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Exam</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic details */}
        <div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
          <h2 className="font-semibold">Exam Details</h2>
          <input
            type="text"
            placeholder="Exam title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Start time</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">End time</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white p-5 rounded-xl shadow-sm border space-y-3">
          <h2 className="font-semibold">Settings</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.settings.shuffleQuestions}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, shuffleQuestions: e.target.checked },
                })
              }
            />
            Shuffle questions for each student
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.settings.disableCopyPaste}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, disableCopyPaste: e.target.checked },
                })
              }
            />
            Disable copy/paste during exam
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.settings.showResultsToStudents}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, showResultsToStudents: e.target.checked },
                })
              }
            />
            Allow students to see their score and correct answers after submitting
          </label>
          <div>
            <label className="text-sm text-gray-600">
              Max tab-switch warnings before auto-submit
            </label>
            <input
              type="number"
              min={1}
              value={form.settings.maxTabSwitchWarnings}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, maxTabSwitchWarnings: Number(e.target.value) },
                })
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* AI Question Generation */}
        <div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
          <h2 className="font-semibold">Generate Questions with AI</h2>

          <div>
            <label className="text-sm text-gray-600">1. Upload source PDF (optional if already ingested)</label>
            <div className="flex gap-2 mt-1">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleUploadPDF}
                disabled={!uploadFile || uploadLoading}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                {uploadLoading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {uploadMessage && <p className="text-xs mt-1 text-gray-600">{uploadMessage}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600">2. What should the questions cover?</label>
            <textarea
              placeholder='e.g. "Focus on chapter 3, photosynthesis and cellular respiration, mix of easy and conceptual questions"'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Number of questions</label>
              <input
                type="number"
                min={1}
                max={25}
                value={aiNumQuestions}
                onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Difficulty</label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={aiLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {aiLoading ? "Generating..." : "Generate with AI"}
          </button>

          {aiError && <p className="text-red-600 text-sm">{aiError}</p>}
          {aiWarnings.length > 0 && (
            <ul className="text-xs text-amber-600 list-disc list-inside">
              {aiWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500">
            Generated questions appear below — review them like any manually added question before publishing.
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <h2 className="font-semibold">Questions</h2>
          {form.questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-5 rounded-xl shadow-sm border space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Question {qIndex + 1}</span>
                {form.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-600 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Question text"
                value={q.questionText}
                onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />

              <div>
                <label className="text-sm text-gray-600">Question type</label>
                <select
                  value={q.questionType}
                  onChange={(e) => updateQuestion(qIndex, "questionType", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="single">Single correct answer</option>
                  <option value="multiple">Multiple correct answers</option>
                  <option value="fill_blank">Fill in the blank</option>
                </select>
              </div>

              {q.questionType === "fill_blank" ? (
                <div>
                  <label className="text-sm text-gray-600">
                    Acceptable answers (comma-separated — any one matches)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paris, paris"
                    value={q.correctAnswers.join(", ")}
                    onChange={(e) => updateFillBlankAnswers(qIndex, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              ) : (
                <>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        type={q.questionType === "multiple" ? "checkbox" : "radio"}
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswers.includes(opt) && opt !== ""}
                        onChange={() => toggleCorrectAnswer(qIndex, opt)}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${optIndex + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2"
                        required
                      />
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">
                    {q.questionType === "multiple"
                      ? "Check all correct options"
                      : "Select the radio button next to the correct option"}
                  </p>
                </>
              )}

              <div>
                <label className="text-sm text-gray-600">Marks</label>
                <input
                  type="number"
                  min={1}
                  value={q.marks}
                  onChange={(e) => updateQuestion(qIndex, "marks", Number(e.target.value))}
                  className="w-24 border rounded-lg px-3 py-2 ml-2"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addQuestion}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            + Add Question
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Exam"}
        </button>
      </form>
    </main>
  );
}