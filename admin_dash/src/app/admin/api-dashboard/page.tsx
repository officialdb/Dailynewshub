import { redirect } from "next/navigation";

export default function AdminApiDashboardRedirectPage() {
  redirect("/developer/dashboard");
}
