import ClientPortal from "./portal";
export const metadata = {
  title: "Client intake — Launchlane",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientPortal token={token} />;
}
