import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInButton from "@/components/SignInButton";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="text-5xl">💡</div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ideas</h1>
          <p className="text-sm text-gray-500">
            Capture raw thoughts. Claude organizes them.
            <br />
            Saved to your Google Sheets &amp; Tasks.
          </p>
        </div>

        <SignInButton />

        <p className="text-xs text-gray-400 leading-relaxed">
          Requires access to Google Drive, Sheets, and Tasks
          to create and manage your personal ideas spreadsheet.
        </p>
      </div>
    </div>
  );
}
