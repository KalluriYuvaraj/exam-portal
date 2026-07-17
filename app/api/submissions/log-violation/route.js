import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Submission from "@/models/Submission";
import { getUserFromRequest } from "@/lib/auth";

// POST /api/submissions/log-violation
export async function POST(req) {
  try {
    await connectDB();
    const user = getUserFromRequest(req);
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { examId, type } = await req.json();
    if (!examId || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const submission = await Submission.findOne({ examId, studentId: user.id });
    if (!submission || submission.status === "submitted") {
      return NextResponse.json({ error: "No active attempt" }, { status: 400 });
    }

    submission.violations.push({ type, timestamp: new Date() });
    await submission.save();

    const violationCount = submission.violations.filter((v) => v.type === "tab_switch").length;

    return NextResponse.json({ message: "Violation logged", violationCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
