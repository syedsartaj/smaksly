import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models';

// POST - Calculate suggested pricing based on metrics
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, da, dr, traffic, niche } = body;

    // Base pricing tiers
    const basePricing = {
      premium: 500, // DA 60+
      high: 300, // DA 40-59
      medium: 150, // DA 20-39
      low: 75, // DA 0-19
    };

    // Get similar websites for comparison
    let comparisonQuery: Record<string, unknown> = {
      acceptsGuestPosts: true,
      guestPostPrice: { $gt: 0 },
    };

    let targetDa = da;
    let targetDr = dr;
    let targetTraffic = traffic;
    let targetNiche = niche;

    // If websiteId provided, get its metrics
    if (websiteId) {
      const website = await Website.findById(websiteId);
      if (website) {
        targetDa = website.da;
        targetDr = website.dr;
        targetTraffic = website.traffic;
        targetNiche = website.niche;
      }
    }

    if (!targetDa && !targetDr) {
      return NextResponse.json(
        { success: false, error: 'DA or DR metrics required for calculation' },
        { status: 400 }
      );
    }

    // Find similar websites (within DA range)
    const daRange = 10;
    comparisonQuery.da = {
      $gte: (targetDa || 0) - daRange,
      $lte: (targetDa || 0) + daRange,
    };

    if (targetNiche) {
      comparisonQuery.niche = targetNiche;
    }

    const similarWebsites = await Website.find(comparisonQuery)
      .select('da dr traffic guestPostPrice niche')
      .limit(50)
      .lean();

    // Calculate base price from DA
    let suggestedPrice = basePricing.low;
    if (targetDa >= 60) {
      suggestedPrice = basePricing.premium;
    } else if (targetDa >= 40) {
      suggestedPrice = basePricing.high;
    } else if (targetDa >= 20) {
      suggestedPrice = basePricing.medium;
    }

    // Adjust based on DR
    if (targetDr) {
      if (targetDr >= targetDa + 10) {
        suggestedPrice *= 1.2; // DR significantly higher than DA
      } else if (targetDr < targetDa - 10) {
        suggestedPrice *= 0.9; // DR significantly lower than DA
      }
    }

    // Adjust based on traffic
    if (targetTraffic) {
      if (targetTraffic >= 100000) {
        suggestedPrice *= 1.5; // High traffic
      } else if (targetTraffic >= 50000) {
        suggestedPrice *= 1.3;
      } else if (targetTraffic >= 10000) {
        suggestedPrice *= 1.1;
      } else if (targetTraffic < 1000) {
        suggestedPrice *= 0.8; // Low traffic
      }
    }

    // Premium niche adjustments
    const premiumNiches = ['finance', 'health', 'technology', 'business', 'legal'];
    if (targetNiche && premiumNiches.includes(targetNiche.toLowerCase())) {
      suggestedPrice *= 1.25;
    }

    // Calculate market comparison
    let marketAvg = 0;
    let marketMin = 0;
    let marketMax = 0;

    if (similarWebsites.length > 0) {
      const prices = similarWebsites.map((w) => (w.guestPostPrice || 0) / 100);
      marketAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
      marketMin = Math.min(...prices);
      marketMax = Math.max(...prices);

      // Blend suggested price with market average
      suggestedPrice = (suggestedPrice + marketAvg) / 2;
    }

    // Round to nearest $5
    suggestedPrice = Math.round(suggestedPrice / 5) * 5;

    // Generate price tiers
    const priceTiers = {
      competitive: Math.round(suggestedPrice * 0.85 / 5) * 5,
      suggested: suggestedPrice,
      premium: Math.round(suggestedPrice * 1.2 / 5) * 5,
    };

    return NextResponse.json({
      success: true,
      data: {
        inputMetrics: {
          da: targetDa,
          dr: targetDr,
          traffic: targetTraffic,
          niche: targetNiche,
        },
        priceTiers,
        marketComparison: {
          similarWebsites: similarWebsites.length,
          average: Math.round(marketAvg),
          min: marketMin,
          max: marketMax,
        },
        factors: {
          basePrice: basePricing[
            targetDa >= 60 ? 'premium' :
            targetDa >= 40 ? 'high' :
            targetDa >= 20 ? 'medium' : 'low'
          ],
          drAdjustment: targetDr
            ? (targetDr >= (targetDa || 0) + 10 ? '+20%' : targetDr < (targetDa || 0) - 10 ? '-10%' : '0%')
            : 'N/A',
          trafficAdjustment: targetTraffic
            ? (targetTraffic >= 100000 ? '+50%' : targetTraffic >= 50000 ? '+30%' : targetTraffic >= 10000 ? '+10%' : targetTraffic < 1000 ? '-20%' : '0%')
            : 'N/A',
          nicheAdjustment: targetNiche && premiumNiches.includes(targetNiche.toLowerCase()) ? '+25%' : '0%',
        },
      },
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}
