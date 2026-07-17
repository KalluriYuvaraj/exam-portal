"use client";

export function saveAuth(token, user) {
  localStorage.setItem("exam_token", token);
  localStorage.setItem("exam_user", JSON.stringify(user));
}

export function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("exam_token");
  const user = localStorage.getItem("exam_user");
  return { token, user: user ? JSON.parse(user) : null };
}

export function clearAuth() {
  localStorage.removeItem("exam_token");
  localStorage.removeItem("exam_user");
}
