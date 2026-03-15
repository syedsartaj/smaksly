import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Website } from '@/models/Website';

// Known registrar name mappings
const REGISTRAR_MAP: Record<string, string> = {
  'hostinger': 'Hostinger',
  'godaddy': 'GoDaddy',
  'namecheap': 'Namecheap',
  'google': 'Google Domains',
  'squarespace': 'Google Domains',
  'cloudflare': 'Cloudflare',
  'amazon': 'AWS Route 53',
  'route 53': 'AWS Route 53',
  'name.com': 'Name.com',
  'dynadot': 'Dynadot',
  'porkbun': 'Porkbun',
  'tucows': 'Tucows',
  'enom': 'eNom',
  'netlify': 'Netlify',
  'gandi': 'Gandi',
  'hover': 'Hover',
  'ionos': 'IONOS',
  'bluehost': 'Bluehost',
  'dreamhost': 'DreamHost',
  'siteground': 'SiteGround',
};

function normalizeRegistrar(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [key, value] of Object.entries(REGISTRAR_MAP)) {
    if (lower.includes(key)) return value;
  }
  // Clean up common suffixes
  return raw
    .replace(/,?\s*(Inc|LLC|Ltd|Limited|Corp|Corporation|GmbH|S\.A\.|B\.V\.)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function lookupRDAP(domain: string): Promise<{
  expiryDate: string | null;
  registrar: string | null;
  error?: string;
}> {
  try {
    // Extract root domain (e.g., "sub.example.com" -> "example.com")
    const parts = domain.replace(/^https?:\/\//, '').split('.');
    const rootDomain = parts.length >= 2 ? parts.slice(-2).join('.') : domain;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`https://rdap.org/domain/${rootDomain}`, {
      signal: controller.signal,
      headers: { Accept: 'application/rdap+json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { expiryDate: null, registrar: null, error: `RDAP returned ${res.status}` };
    }

    const data = await res.json();

    // Extract expiry date from events
    let expiryDate: string | null = null;
    if (data.events && Array.isArray(data.events)) {
      const expiryEvent = data.events.find(
        (e: any) => e.eventAction === 'expiration'
      );
      if (expiryEvent?.eventDate) {
        expiryDate = expiryEvent.eventDate;
      }
    }

    // Extract registrar from entities
    let registrar: string | null = null;
    if (data.entities && Array.isArray(data.entities)) {
      const registrarEntity = data.entities.find(
        (e: any) => e.roles?.includes('registrar')
      );
      if (registrarEntity) {
        // Try vcardArray first
        if (registrarEntity.vcardArray) {
          const vcard = registrarEntity.vcardArray[1];
          if (vcard) {
            const fnEntry = vcard.find((v: any) => v[0] === 'fn');
            if (fnEntry) registrar = fnEntry[3];
          }
        }
        // Fallback to handle
        if (!registrar && registrarEntity.handle) {
          registrar = registrarEntity.handle;
        }
        // Fallback to publicIds
        if (!registrar && registrarEntity.publicIds) {
          registrar = registrarEntity.publicIds[0]?.identifier || null;
        }
      }
    }

    // Fallback: try top-level entities for registrar name
    if (!registrar && data.entities) {
      for (const entity of data.entities) {
        if (entity.vcardArray?.[1]) {
          const fn = entity.vcardArray[1].find((v: any) => v[0] === 'fn');
          if (fn?.[3]) {
            registrar = fn[3];
            break;
          }
        }
      }
    }

    if (registrar) {
      registrar = normalizeRegistrar(registrar);
    }

    return { expiryDate, registrar };
  } catch (error: any) {
    return {
      expiryDate: null,
      registrar: null,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
    };
  }
}

// POST: Lookup RDAP for specific website(s) and save to DB
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { websiteId, all } = body;

    let websites;
    if (all) {
      // Lookup all websites that have a customDomain
      websites = await Website.find(
        { $or: [{ customDomain: { $exists: true, $ne: '' } }, { domain: { $exists: true } }] },
        { _id: 1, domain: 1, customDomain: 1 }
      ).lean();
    } else if (websiteId) {
      const website = await Website.findById(websiteId, { _id: 1, domain: 1, customDomain: 1 }).lean();
      if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      websites = [website];
    } else {
      return NextResponse.json({ error: 'Provide websiteId or all=true' }, { status: 400 });
    }

    const results: any[] = [];

    for (const site of websites) {
      const domainToLookup = site.customDomain || site.domain;

      // Skip Vercel subdomains
      if (domainToLookup.includes('.vercel.app') || domainToLookup.includes('.vercel.dev')) {
        results.push({
          websiteId: site._id,
          domain: domainToLookup,
          skipped: true,
          reason: 'Vercel subdomain',
        });
        continue;
      }

      const rdap = await lookupRDAP(domainToLookup);

      const update: Record<string, any> = {};
      if (rdap.expiryDate) update.domainExpiryDate = new Date(rdap.expiryDate);
      if (rdap.registrar) update.domainProvider = rdap.registrar;

      if (Object.keys(update).length > 0) {
        await Website.findByIdAndUpdate(site._id, update);
      }

      results.push({
        websiteId: site._id,
        domain: domainToLookup,
        expiryDate: rdap.expiryDate,
        registrar: rdap.registrar,
        error: rdap.error,
        updated: Object.keys(update).length > 0,
      });

      // Small delay between requests to avoid rate limiting
      if (websites.length > 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const successCount = results.filter((r) => r.updated).length;
    const errorCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        updated: successCount,
        errors: errorCount,
        skipped: results.filter((r) => r.skipped).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
