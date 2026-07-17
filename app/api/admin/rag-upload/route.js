import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { uploadDocumentToRAG } from "@/lib/ragClient";

// POST /api/admin/rag-upload -> admin uploads a PDF, forwarded to the RAG service
export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadDocumentToRAG(buffer, file.name);

    return NextResponse.json({ message: "Document ingested", ...result });
  } catch (err) {
    console.error("rag-upload error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}