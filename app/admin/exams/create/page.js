"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/clientAuth";

const emptyQuestion = () => ({
  questionText: "",
  options: ["", "", "", ""],
  correctAnswer: "",
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
    },
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateQuestion = (index, field, value) => {
    const updated = [...form.questions];
    updated[index][field] = value;
    setForm({ ...form, questions: updated });
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...form.questions];
    updated[qIndex].options[optIndex] = value;
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

    // Basic validation: every question must have a correctAnswer matching an option
    for (const [i, q] of form.questions.entries()) {
      if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
        setError(`Question ${i + 1}: correct answer must match one of the options exactly`);
        return;
      }
    }

    setLoading(true);
    try {
      const { token } = getAuth();
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
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
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correctAnswer === opt && opt !== ""}
                    onChange={() => updateQuestion(qIndex, "correctAnswer", opt)}
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
              <p className="text-xs text-gray-500">Select the radio button next to the correct option</p>
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
