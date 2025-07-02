import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongo';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) return NextResponse.json({ error: 'User already exists' }, { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({ email, password: hashedPassword });

  return NextResponse.json({ message: 'Signup successful', user: newUser });
}
