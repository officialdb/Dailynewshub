import { redirect } from "next/navigation";

export default function LegacyArticlesPage() {
  redirect("/admin/articles");
}
