import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const path = params?.path?.join('/') || ''
  if (path === '' || path === 'health') {
    return NextResponse.json({ status: 'ok', service: 'S&OP Demo API' })
  }
  return NextResponse.json({ message: `GET /api/${path}` })
}

export async function POST(request, { params }) {
  const path = params?.path?.join('/') || ''
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ message: `POST /api/${path}`, received: body })
}
