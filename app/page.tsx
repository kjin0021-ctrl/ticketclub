import type { Metadata } from "next";
import { TicketClubHome } from "../components/TicketClubHome";

export const metadata: Metadata = {
  title: "TicketClub 票来 — 艺人行程与追星旅行助手",
  description: "追踪公开艺人活动，判断能否抵达，并生成可执行的追星旅行计划。",
};

export default function Home() {
  return <TicketClubHome />;
}

