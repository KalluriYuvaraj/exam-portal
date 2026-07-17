import mongoose from "mongoose";

const violationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // "tab_switch" | "copy_attempt" | "fullscreen_exit" etc
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedAnswer: { type: String, default: "" },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: { type: [answerSchema], default: [] },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date },
    autoSubmitted: { type: Boolean, default: false },
    violations: { type: [violationSchema], default: [] },
    score: { type: Number, default: null },
    status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
  },
  { timestamps: true }
);

// A student can only have one submission per exam
submissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
