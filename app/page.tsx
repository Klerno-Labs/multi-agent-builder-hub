"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect immediately to Jordan chat
    router.push("/jordan");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-slate-300 animate-pulse">
          Launching Jordan...
        </div>
      </div>
    </div>
  );
}
