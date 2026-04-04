import { redirect } from "next/navigation";

/** Sai chính tả phổ biến — chuyển sang `/attendees`. */
export default function AttendesRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/workspace/schedule-meeting/${params.id}/attendees`);
}
