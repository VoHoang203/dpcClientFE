import { Suspense } from "react";
import GoogleSuccessContent from "./GoogleSuccessContent";

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={<div>Đang đăng nhập...</div>}>
      <GoogleSuccessContent />
    </Suspense>
  );
}