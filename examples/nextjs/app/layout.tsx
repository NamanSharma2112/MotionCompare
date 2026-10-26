import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MotionLab example",
  description: "A real Next.js application with the MotionLab SDK installed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4f4f5" }}>{children}</body>
    </html>
  );
}
