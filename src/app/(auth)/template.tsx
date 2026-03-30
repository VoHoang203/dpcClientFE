import { PageEaseIn } from "@/components/loading/PageEaseIn";

/**
 * Giới hạn chiều ngang + căn giữa nội dung form (login max-w-md, complete-profile max-w-2xl).
 */
export default function AuthTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageEaseIn className="mx-auto flex w-full max-w-2xl flex-col items-center">
      {children}
    </PageEaseIn>
  );
}
