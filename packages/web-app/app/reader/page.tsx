import { Suspense } from "react";
import ReaderPageClient from "./ReaderClient";

export default function ReaderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReaderPageClient />
    </Suspense>
  );
}