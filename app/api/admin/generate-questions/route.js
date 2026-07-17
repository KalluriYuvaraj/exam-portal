import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { generateQuestionsFromRAG } from "@/lib/ragClient";

// POST /api/admin/generate-questions -> admin-only, proxies to the self-hosted RAG service
export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { topicPrompt, numQuestions, difficulty } = await req.json();

    if (!topicPrompt || !topicPrompt.trim()) {
      return NextResponse.json({ error: "topicPrompt is required" }, { status: 400 });
    }

    const result = await generateQuestionsFromRAG({
      topicPrompt,
      numQuestions: numQuestions || 5,
      difficulty: difficulty || "medium",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("generate-questions error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
