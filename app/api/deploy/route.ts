import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { dir } from 'tmp-promise';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const { repo, userEmail, domain } = await req.json();

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
  const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
  const VERCEL_TOKEN = process.env.VERCELTOKEN!;
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL!;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const newRepoName = `clone-${Math.floor(Math.random() * 100000)}`;
  const projectName = `vercel-${newRepoName}`;

  try {
    console.log("user email in deploy", userEmail);
    console.log("🚧 Starting deployment process...");
    const tmp = await dir({ unsafeCleanup: true });
    const git = simpleGit(tmp.path);
    console.log("📁 Temp directory created at:", tmp.path);

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
    console.log("✅ GitHub repo created:", newRepoURL);

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

    const project = await projectRes.json() as any;
    if (!project.id) throw new Error("❌ Failed to create Vercel project");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const client = await auth.getClient() as any;
    const drive = google.drive({ version: 'v3', auth: client });
    const sheets = google.sheets({ version: 'v4', auth: client });

    const createSheetRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: 'Shared Project Sheet' },
      },
    });

    const spreadsheetId = createSheetRes.data.spreadsheetId!;
    console.log("✅ Sheet created with ID:", spreadsheetId);

    // Add Sheet2 using batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Sheet2',
                index: 1, // Place Sheet2 as the second sheet
              },
            },
          },
        ],
      },
    });
    console.log("✅ Sheet2 created in the spreadsheet");

    await drive.files.update({
      fileId: spreadsheetId,
      addParents: '15DgfharKkrvsLa17OwV3zmUbmF1GuyOd',
      fields: 'id, parents',
    });

    // Set Sheet1 header and initialize id column with formula
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Sheet1!A1:T1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'id', 'link', 'code_template', 'title', 'image_url',
          'robottxt_headline', 'robottxt_url', 'robottxt_auther_name',
          'robottxt_auther_url', 'robottxt_image_url', 'robottxt_image_width',
          'robottxt_image_height', 'robottxt_publish_date', 'robottxt_modify_date',
          'robottxt_publisher_logo', 'robottxt_publisher_keyword', 'category', 'body','slug',
        ]],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Sheet2!A1:Q2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            'Header', 'Hero', 'Heading', 'Subheading', 'ButtonText',
            'Footer', 'companyName', 'companySlogan', 'layoutType',
            'primaryColor', 'secondaryColor', 'fontFamily', 'bloglayout','body_aboutus','body_contactus','body_privacy_policy','body_services'
          ],
          [
            2, 4, 'Unleash Your Potentials', 'Innovative marketing strategies for the digital age.',
            'Start Your Journeys', 2, 'BrandBoost', 'Your partner in digital success.',
            2, '#2563eb', '#e5e7eb', 'Inter, sans-serif', 2,'','','',''
          ]
        ],
      },
    });

    const finalEnvVars = [
      { key: "SPREADSHEET_ID", value: spreadsheetId },
      { key: "GOOGLE_CLIENT_EMAIL", value: GOOGLE_CLIENT_EMAIL },
      { key: "GOOGLE_PRIVATE_KEY", value: process.env.GOOGLE_PRIVATE_KEY! },
      { key: "DOMAIN", value: `https://${projectName}.vercel.app` },
    ];

    for (const env of finalEnvVars) {
      await fetch(`https://api.vercel.com/v9/projects/${projectName}/env`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: env.key,
          value: env.value,
          target: ["production"],
          type: "encrypted",
        }),
      });
      console.log(`📄 ENV var added: ${env.key}`);
    }

    await git.addRemote("origin", `https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${newRepoName}.git`);
    await git.push("origin", "main");
    console.log("🚀 Code pushed to GitHub and Vercel will auto-deploy");

    if (userEmail) {
      await connectDB();
      await User.updateOne(
        { email: userEmail },
        {
          $push: {
            deployments: {
              SPREADSHEET_ID: spreadsheetId,
              GOOGLE_CLIENT_EMAIL,
              GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY!,
              DOMAIN: `https://${projectName}.vercel.app`,
              git_repo: newRepoURL,
              vercel_id: projectName,
            },
          },
        }
      );
      console.log(`✅ Deployment stored for ${userEmail}`);
    }

    if (domain) {
      await fetch(`https://api.vercel.com/v10/projects/${projectName}/domains`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      });
      console.log("🌐 Custom domain mapped:", domain);
    }

    return NextResponse.json({ url: `https://${projectName}.vercel.app`, spreadsheetId });
  } catch (err: any) {
    console.error("❌ DEPLOY ERROR:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}