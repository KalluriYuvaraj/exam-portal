// Server-side only. Talks to the self-hosted RAG service over the Cloudflare Tunnel URL.
// Credentials live in server env vars and are never sent to the browser.

const RAG_BASE_URL = process.env.RAG_SERVICE_URL; // e.g. https://rag.yourdomain.com/api/v1
const RAG_USERNAME = process.env.RAG_SERVICE_USERNAME;
const RAG_PASSWORD = process.env.RAG_SERVICE_PASSWORD;
const RAG_TENANT_ID = process.env.RAG_SERVICE_TENANT_ID || "default";

// Simple in-memory token cache (per server instance). Good enough for admin-only,
// low-frequency usage. Re-logs in automatically if the cached token is rejected.
let cachedToken = null;

async function ragLogin() {
  const form = new URLSearchParams();
  form.set("username", RAG_USERNAME);
  form.set("password", RAG_PASSWORD);

  const res = await fetch(`${RAG_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`RAG service login failed: ${detail}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  return cachedToken;
}

async function ragFetch(path, options = {}, retry = true) {
  if (!cachedToken) {
    await ragLogin();
  }

  const res = await fetch(`${RAG_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${cachedToken}`,
    },
  });

  // Token expired or invalid — log in again once and retry.
  if (res.status === 401 && retry) {
    cachedToken = null;
    await ragLogin();
    return ragFetch(path, options, false);
  }

  return res;
}

/**
 * Ask the RAG service to generate structured MCQs from previously-ingested PDFs.
 * Returns { questions, sources, warnings }.
 */
export async function generateQuestionsFromRAG({
  topicPrompt,
  numQuestions = 5,
  difficulty = "medium",
}) {
  if (!RAG_BASE_URL) {
    throw new Error("RAG_SERVICE_URL is not configured on the server.");
  }

  const res = await ragFetch("/generate-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: RAG_TENANT_ID,
      topic_prompt: topicPrompt,
      num_questions: numQuestions,
      difficulty,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || "RAG question generation failed");
  }

  return data; // { questions, sources, warnings }
}

/**
 * Upload a PDF (as a Buffer/Blob) to the RAG service so it can be used as source material.
 */
export async function uploadDocumentToRAG(fileBuffer, filename, acl = "admin") {
  if (!RAG_BASE_URL) {
    throw new Error("RAG_SERVICE_URL is not configured on the server.");
  }

  const formData = new FormData();
  formData.append("tenant_id", RAG_TENANT_ID);
  formData.append("acl", acl);
  formData.append("files", new Blob([fileBuffer]), filename);

  const res = await ragFetch("/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || "RAG document upload failed");
  }

  return data;
}
