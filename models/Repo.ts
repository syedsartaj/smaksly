// /models/Repo.ts
import mongoose from "mongoose";

const RepoSchema = new mongoose.Schema({
  name: String,
  url: String,
  category: String,
  vercel_id: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Repo || mongoose.model("Repo", RepoSchema);
