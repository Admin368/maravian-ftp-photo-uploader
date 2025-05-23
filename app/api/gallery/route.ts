import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const url = process.env.DOMAIN_PREFIX + "/" + username;
    console.log(url);
    const response = await fetch(url);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching gallery data:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery data" },
      { status: 500 }
    );
  }
}
