import { readPublicAnnouncementPage } from "../../../../lib/public-page-reader";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    if (!body.url || typeof body.url !== "string") return Response.json({ error: "请提供活动页面链接。" }, { status: 400 });
    const result = await readPublicAnnouncementPage(body.url);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "页面读取失败。";
    const userError = /只支持|不能|请输入|X 页面|不是可读取|没有足够/.test(message);
    return Response.json({ error: message }, { status: userError ? 422 : 502 });
  }
}
