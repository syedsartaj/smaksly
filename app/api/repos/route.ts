import { NextResponse } from "next/server";
import { connectDB } from '@/lib/db';
import Repo from "@/models/Repo";

export async function GET() {
  try {
    await connectDB();

    const repos = await Repo.find({}, { name: 1, url: 1, category: 1, _id: 0, vercel_id: 1, createdAt: 1 })
      .sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, repos });
  } catch (error: any) {
    console.error("❌ Repo Fetch Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, url, category, vercel_id } = body;

    if (!name || !url) {
      return NextResponse.json(
        { ok: false, error: "Name and URL are required." },
        { status: 400 }
      );
    }

    const newRepo = new Repo({
      name,
      url,
      category,
      vercel_id: vercel_id || null,
    });

    await newRepo.save();
    console.log("✅ Repo added:", newRepo);
    return NextResponse.json({
      ok: true,
      message: "✅ Repository added successfully!",
      repo: newRepo,
    });
  } catch (error: any) {
    console.error("❌ Repo Add Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}