import { redirect } from "next/navigation";

export default function SpeedRunRedirectPage() {
  redirect("/tracker?speedrun=true");
}
