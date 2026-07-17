import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/exams/:examId -> get a single exam
// Students get sanitized version (no correct answers)
export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const exam = await Exam.findById(params.examId);
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    if (user.role === "admin") {
      if (exam.createdBy.toString() !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ exam });
    }

    // Student view: strip correct answers
    const sanitized = exam.toObject();
    sanitized.questions = sanitized.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks,
    }));

    return NextResponse.json({ exam: sanitized });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/exams/:examId -> update exam (admin only, must own it)
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const exam = await Exam.findById(params.examId);
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    if (exam.createdBy.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates = await req.json();
    Object.assign(exam, updates);
    await exam.save();

    return NextResponse.json({ exam });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/exams/:examId -> delete exam (admin only, must own it)
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const exam = await Exam.findById(params.examId);
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    if (exam.createdBy.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await exam.deleteOne();
    return NextResponse.json({ message: "Exam deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
