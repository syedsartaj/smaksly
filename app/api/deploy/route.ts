import { NextRequest, NextResponse } from 'next/server';
import { dir } from 'tmp-promise';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { connectDB } from '@/lib/db';
import Client from '../../../models/Client'; // new schema

export async function POST(req: NextRequest) {
  const { repo, userEmail, category } = await req.json();

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
  const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
  const VERCEL_TOKEN = process.env.VERCELTOKEN!;
  const MongoDB_URL = process.env.MONGODB_URI;

  const newRepoName = `${Math.floor(Math.random() * 100000)}`;
  const projectName = `Smaksly-${newRepoName}`;

  try {
    console.log("user email in deploy", userEmail);
    const tmp = await dir({ unsafeCleanup: true });
    const git = simpleGit(tmp.path);
    await git.clone(repo, ".");
    await git.removeRemote("origin");

    const readmePath = path.join(tmp.path, "README.md");
    fs.writeFileSync(readmePath, `# Trigger Deploy\nDeployed at ${new Date().toISOString()}`);
    await git.add(".");
    await git.commit("chore: trigger deploy via update");

    const createRes = await fetch(`https://api.github.com/user/repos`, {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newRepoName, private: false }),
    });

    const createRepoData = await createRes.json() as any;
    const newRepoURL = createRepoData.clone_url;
console.log("GitHub createRes status:", createRes.status);
console.log("GitHub createRes body:", createRepoData);


// --- Sanitize name ---
let projectName = `${userEmail.split("@")[0]}-${Date.now()}`;
projectName = projectName.toLowerCase().replace(/[^a-z0-9._-]/g, "-");

// --- Create project on Vercel ---
const projectRes = await fetch("https://api.vercel.com/v9/projects", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: projectName,
    gitRepository: {
      type: "github",
      repo: `${GITHUB_USERNAME}/${newRepoName}`,
    },
    framework: "nextjs",
  }),
});

console.log("Vercel create project status:", projectRes.status);
const text = await projectRes.text();
console.log("Vercel create project body:", text);

let project;
try {
  project = JSON.parse(text);
} catch (e) {
  console.error("Failed to parse JSON:", e);
  throw new Error("❌ Invalid JSON from Vercel API");
}

if (!project.id) throw new Error("❌ Failed to create Vercel project");

    // Inject userEmail as env variable into Vercel project
    await fetch(`https://api.vercel.com/v10/projects/${project.name}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'USER_EMAIL',
        value: userEmail,
        target: ['production', 'preview', 'development']
      }),
    });
    // Inject userEmail as env variable into Vercel project
    await fetch(`https://api.vercel.com/v10/projects/${project.name}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'MongoDB_URL',
        value: MongoDB_URL,
        target: ['production', 'preview', 'development']
      }),
    });
    const finalDomain = `https://${projectName}.vercel.app`;

    await git.addRemote("origin", `https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${newRepoName}.git`);
    await git.push("origin", "main");

    // Default layout + blog structure
    const layout = {
      Header: "2",
      Hero: "4",
      Heading: "Unleash Your Potentials",
      Subheading: "Innovative marketing strategies for the digital age.",
      ButtonText: "Start Your Journeys",
      Footer: "2",
      companyName: "BrandBoost",
      companySlogan: "Your partner in digital success.",
      layoutType: "2",
      primaryColor: "#2563eb",
      secondaryColor: "#e5e7eb",
      fontFamily: "Inter, sans-serif",
      bloglayout: "2",
      body_aboutus: "",
      body_contactus: "",
      body_privacy_policy: "",
      body_services: "",
      emailid:"",
      publish_date:new Date().toISOString(),
    };

    const blogs = [] as any; // Initially empty, can be edited later

    if (userEmail) {
      await connectDB();
      await Client.updateOne(
        { email: userEmail },
        {
          $push: {
            "Deployments": {
              Domain: finalDomain,
              category: category,
              Custom_Domian:"",
              git_repo: newRepoURL,
              vercel_id: projectName,
              Data: [{ Layout: layout, blogs }]
            }
          }
        },
        { upsert: true }
      );
      console.log(`✅ Deployment stored for ${userEmail}`);
    }

    // if (domain) {
    //   await fetch(`https://api.vercel.com/v10/projects/${projectName}/domains`, {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${VERCEL_TOKEN}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ name: domain }),
    //   });
    //   console.log("🌐 Custom domain mapped:", domain);
    // }

    return NextResponse.json({ url: finalDomain });
  } catch (err: any) {
    console.error("❌ DEPLOY ERROR:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
