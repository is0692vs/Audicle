import { AutoCloseComponent } from "../AutoCloseComponent";

interface SuccessPageProps {
  searchParams: Promise<{
    title?: string;
  }>;
}

export default async function ShareTargetSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;
  const articleTitle = params.title || "記事";

  return <AutoCloseComponent articleTitle={articleTitle} />;
}
