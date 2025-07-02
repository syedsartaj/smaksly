'use client';

import { useState } from "react";
import { useRouter } from "next/navigation"; // 👈 import router
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function Home() {
  const [repo, setRepo] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [domain, setDomain] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter(); // 👈 initialize router

  const handleDeploy = async () => {
    const userEmail = localStorage.getItem("userEmail");
    setLoading(true);
    setDeployUrl("");
    console.log("start");
    console.log(userEmail, "deploy button");

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo,
          envVars: JSON.parse(envVars || "{}"),
          domain: domain || null,
          userEmail: userEmail || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deployment failed");

      console.log("done");
      setDeployUrl(data.url);

      // ✅ Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard'); // ✅ Redirect to dashboard
      }, 1500); // Small delay to show success message
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#1f1d1d]">
        <Header />
        <main className="max-w-xl mx-auto p-6 space-y-4">
          <h1 className="text-2xl font-bold text-white">🔁 Deploy GitHub Repo to Vercel</h1>

          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="w-full p-2 border-[0.1px] text-white rounded bg-[#403f3f]"
            placeholder="GitHub Repo URL (e.g. https://github.com/user/project)"
          />

          <textarea
            value={envVars}
            onChange={(e) => setEnvVars(e.target.value)}
            className="w-full p-2 border-[0.1px] text-white rounded bg-[#403f3f]"
            placeholder='Optional ENV JSON (e.g. {"API_KEY":"abc"})'
            rows={4}
          />

          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full p-2 border rounded bg-[#403f3f]"
            placeholder="Optional custom domain (e.g. mydomain.com)"
          />

          <button
            onClick={handleDeploy}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Deploying..." : "Deploy Now"}
          </button>

          {deployUrl && (
            <p className="mt-4 text-green-600">
              ✅ Deployed: <a href={`${deployUrl}`} target="_blank">{deployUrl}</a>
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
