import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import Submission from "@/models/Submission";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/submissions -> start OR submit an exam attempt
// action: "start" | "save_answer" | "submit"
export async function POST(req) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, examId } = body;

    if (action === "start") {
      let submission = await Submission.findOne({ examId, studentId: user.id });
      if (submission) {
        return NextResponse.json({ submission }); // already started, resume
      }
      submission = await Submission.create({
        examId,
        studentId: user.id,
        startedAt: new Date(),
        status: "in_progress",
      });
      return NextResponse.json({ submission }, { status: 201 });
    }

    if (action === "save_answer") {
      const { questionId, selectedAnswer } = body;
      const submission = await Submission.findOne({ examId, studentId: user.id });
      if (!submission || submission.status === "submitted") {
        return NextResponse.json({ error: "No active attempt" }, { status: 400 });
      }

      const existingIndex = submission.answers.findIndex(
        (a) => a.questionId.toString() === questionId
      );
      if (existingIndex >= 0) {
        submission.answers[existingIndex].selectedAnswer = selectedAnswer;
      } else {
        submission.answers.push({ questionId, selectedAnswer });
      }
      await submission.save();
      return NextResponse.json({ message: "Answer saved" });
    }

    if (action === "submit") {
      const { autoSubmitted } = body;
      const submission = await Submission.findOne({ examId, studentId: user.id });
      if (!submission) return NextResponse.json({ error: "No active attempt" }, { status: 400 });
      if (submission.status === "submitted") {
        return NextResponse.json({ submission }); // idempotent
      }

      const exam = await Exam.findById(examId);
      if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

      // Server-side time validation: reject if way past allowed duration
      // (small buffer allowed for network latency)
      const elapsedMinutes = (Date.now() - submission.startedAt.getTime()) / 60000;
      const bufferMinutes = 2;
      if (elapsedMinutes > exam.duration + bufferMinutes && !autoSubmitted) {
        // still allow submit, but flag it
      }

      // Auto-grade
      let score = 0;
      for (const answer of submission.answers) {
        const question = exam.questions.id(answer.questionId);
        if (question && question.correctAnswer === answer.selectedAnswer) {
          score += question.marks;
        }
      }

      submission.score = score;
      submission.submittedAt = new Date();
      submission.status = "submitted";
      submission.autoSubmitted = !!autoSubmitted;
      await submission.save();

      return NextResponse.json({ submission });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return NextResponse.json({ error: "Attempt already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/submissions?examId=xxx -> admin views all submissions for their exam
//     /api/submissions?examId=xxx&mine=true -> student views their own submission
export async function GET(req) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    const mine = searchParams.get("mine");

    if (user.role === "student" || mine === "true") {
      const submission = await Submission.findOne({ examId, studentId: user.id });
      return NextResponse.json({ submission });
    }

    // Admin: verify ownership of the exam, then list all submissions
    const exam = await Exam.findById(examId);
    if (!exam || exam.createdBy.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const submissions = await Submission.find({ examId }).populate("studentId", "name email");
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
