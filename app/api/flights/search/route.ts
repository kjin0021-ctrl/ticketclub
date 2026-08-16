import { searchAmadeusFlights } from "../../../../lib/amadeus-flight-provider";

function airport(value: string | null, fallback: string) {
  const normalized = (value ?? fallback).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = airport(url.searchParams.get("origin"), "MEL");
  const destination = airport(url.searchParams.get("destination"), "ICN");
  const departureDate = url.searchParams.get("date") ?? "";
  if (!origin || !destination || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    return Response.json({ error: "请提供有效的出发机场、抵达机场和日期。" }, { status: 400 });
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return Response.json({
      configured: false,
      error: "尚未配置 Amadeus 免费测试密钥，可继续使用本地估算或手动航班。",
    }, { status: 503 });
  }

  try {
    const candidates = await searchAmadeusFlights({ clientId, clientSecret, origin, destination, departureDate });
    return Response.json({ configured: true, environment: "test", candidates });
  } catch (error) {
    return Response.json({ configured: true, error: error instanceof Error ? error.message : "航班查询失败" }, { status: 502 });
  }
}
