import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: String, required: true }, // must match one of options
    marks: { type: Number, default: 1 },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    duration: { type: Number, required: true }, // minutes
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    questions: { type: [questionSchema], default: [] },
    settings: {
      shuffleQuestions: { type: Boolean, default: false },
      maxTabSwitchWarnings: { type: Number, default: 3 },
      disableCopyPaste: { type: Boolean, default: true },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Exam || mongoose.model("Exam", examSchema);
