import LoadingPreviewContent from "./loading-content";
import { loadingPageMetadata } from "./loading-route-meta";

export const metadata = loadingPageMetadata;

export default function LoadingPreviewPage() {
  return <LoadingPreviewContent />;
}
