import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  deployments: [
    {
      SPREADSHEET_ID: String,
      GOOGLE_CLIENT_EMAIL: String,
      GOOGLE_PRIVATE_KEY: String,
      DOMAIN: String,
      git_repo: String,
      vercel_id: String,
    }
  ],
});

export default mongoose.models.User || mongoose.model('User', userSchema);
