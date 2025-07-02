import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongo';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  await connectToDatabase();

  const user = await User.findOne({ email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  // You can return session info or JWT here
  return NextResponse.json({ message: 'Login successful', user });
}
