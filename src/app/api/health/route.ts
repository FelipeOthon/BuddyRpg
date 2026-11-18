import { NextResponse, connection } from 'next/server';

export async function GET() {
  await connection();
  return NextResponse.json({
    ok: true,
    service: 'buddy-rpg',
    timestamp: new Date().toISOString(),
  });
}
