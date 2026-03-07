import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, size = '1792x1024', style = 'natural' } = body;

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Image prompt must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is required for image generation' },
        { status: 500 }
      );
    }

    // Generate image with DALL-E 3
    const response = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: `Professional blog featured image: ${prompt}. High quality, clean composition, suitable for a professional blog post.`,
      n: 1,
      size: size as '1024x1024' | '1792x1024' | '1024x1792',
      style: style as 'natural' | 'vivid',
      quality: 'standard',
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Upload to Cloudinary for permanent storage
    let permanentUrl = imageUrl;
    try {
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: 'smaksly-blog-images',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      permanentUrl = uploadResult.secure_url;
    } catch (uploadErr) {
      console.error('Cloudinary upload failed, using temporary URL:', uploadErr);
      // Fall back to temporary DALL-E URL (expires in 1 hour)
    }

    return NextResponse.json({
      success: true,
      data: {
        url: permanentUrl,
        revisedPrompt,
      },
    });
  } catch (error) {
    console.error('Error generating image:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
