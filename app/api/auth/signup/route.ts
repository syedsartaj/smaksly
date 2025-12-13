import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongo';
import Client from '@/models/Client';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  await connectToDatabase();

  const existing = await Client.findOne({ email });
  if (existing) return NextResponse.json({ error: 'Client already exists' }, { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newClient = await Client.create({ 
    email,
    password: hashedPassword,
    deployments: [], // 👈 Add this line to initialize empty deployments array
 });

  return NextResponse.json({ message: 'Signup successful', Client: newClient });
}
