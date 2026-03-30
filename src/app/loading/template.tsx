/**
 * Không bọc PageEaseIn — route preview loading giữ đơn giản, không animate như trang nội dung.
 */
export default function LoadingRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
