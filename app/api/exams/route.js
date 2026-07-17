import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/exams -> list exams
// Admin sees all their exams. Student sees only published exams.
export async function GET(req) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let exams;
    if (user.role === "admin") {
      exams = await Exam.find({ createdBy: user.id }).sort({ createdAt: -1 });
    } else {
      // Students should not receive correctAnswer fields
      exams = await Exam.find({ isPublished: true })
        .select("-questions.correctAnswer")
        .sort({ startTime: 1 });
    }

    return NextResponse.json({ exams });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/exams -> create new exam (admin only)
export async function POST(req) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, duration, startTime, endTime, questions, settings } = body;

    if (!title || !duration || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required exam fields" }, { status: 400 });
    }

    const exam = await Exam.create({
      title,
      description,
      duration,
      startTime,
      endTime,
      questions: questions || [],
      settings: settings || {},
      createdBy: user.id,
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
