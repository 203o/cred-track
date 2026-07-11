"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { roleLabels, type UserRole } from "@/lib/user-profile";

const roles: UserRole[] = ["BUSINESS", "SUPPLIER", "INDIVIDUAL"];

export default function DevSetupPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isSavingRole, setIsSavingRole] = useState<UserRole | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setupRole = async (role: UserRole) => {
    if (!session?.user?.id) {
      setError("Sign in first, then open this setup page again.");
      return;
    }

    setIsSavingRole(role);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/dev/setup-current-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          role,
        }),
      });
      const data = (await response.json()) as {
        seeded?: string;
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to set up demo data.");
      }

      window.localStorage.setItem("holwa:selected-role", role);
      setMessage(`Ready: ${data.seeded || roleLabels[role]}.`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up role.");
    } finally {
      setIsSavingRole(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-blue-700">Development setup</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-950">
          Seed dashboard data for this Firebase user
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Use this only while testing. It creates the profile and sample data
          needed to see role-specific dashboard features.
        </p>

        <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {isPending
            ? "Checking your sign-in..."
            : session?.user
            ? `Signed in as ${session.user.email || session.user.name || session.user.id}`
            : "You are not signed in."}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setupRole(role)}
              disabled={isPending || !session?.user || Boolean(isSavingRole)}
              className="rounded-lg border border-blue-200 bg-white px-4 py-4 text-left hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block font-semibold text-gray-950">
                {roleLabels[role]}
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                {isSavingRole === role ? "Setting up..." : "Create demo data"}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
