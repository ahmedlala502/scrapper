import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  action: 'search' | 'scrape' | 'autocomplete' | 'verify';
  query?: string;
  url?: string;
  platform?: string;
  username?: string;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  platform: string;
  contentType: string;
}

interface ScrapeResult {
  title: string;
  description: string;
  image: string | null;
  type: string;
  platform: string;
  username: string | null;
  url: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const platformPatterns = {
  instagram: {
    urlPattern: /instagram\.com/,
    usernamePattern: /instagram\.com\/([A-Za-z0-9._]+)/,
    postPattern: /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
    storyPattern: /instagram\.com\/stories\/([A-Za-z0-9._]+)/,
    contentType: (url: string) => {
      if (url.includes('/reel/')) return 'reel';
      if (url.includes('/tv/')) return 'video';
      if (url.includes('/stories/')) return 'story';
      if (url.includes('/p/')) return 'post';
      return 'post';
    }
  },
  snapchat: {
    urlPattern: /snapchat\.com/,
    usernamePattern: /snapchat\.com\/add\/([A-Za-z0-9._]+)/,
    storyPattern: /story\.snapchat\.com\/@([A-Za-z0-9._]+)/,
    contentType: (url: string) => {
      if (url.includes('story.snapchat.com')) return 'story';
      return 'snap';
    }
  },
  tiktok: {
    urlPattern: /tiktok\.com/,
    usernamePattern: /tiktok\.com\/@([A-Za-z0-9._]+)/,
    videoPattern: /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
    contentType: (url: string) => {
      if (url.includes('/video/')) return 'video';
      return 'post';
    }
  }
};

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`Search failed with status ${response.status}`);
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Parse DuckDuckGo HTML results
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__url"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 20) {
      const url = match[1];
      const title = match[2].trim();
      const description = match[4].replace(/<[^>]*>/g, '').trim();

      // Detect platform
      let platform = 'unknown';
      let contentType = 'post';

      for (const [name, patterns] of Object.entries(platformPatterns)) {
        if (patterns.urlPattern.test(url)) {
          platform = name;
          contentType = patterns.contentType(url);
          break;
        }
      }

      results.push({
        title,
        url: url.startsWith('http') ? url : `https://${url}`,
        description: description.substring(0, 200),
        platform,
        contentType
      });
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

async function scrapeUrl(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract metadata
    const getMeta = (property: string): string | null => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
      return match ? match[1] : null;
    };

    const getTitle = (): string => {
      const ogTitle = getMeta('og:title');
      if (ogTitle) return ogTitle;
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : 'Untitled';
    };

    const getDescription = (): string => {
      const ogDesc = getMeta('og:description');
      if (ogDesc) return ogDesc;
      const twitterDesc = getMeta('twitter:description');
      if (twitterDesc) return twitterDesc;
      const descMeta = getMeta('description');
      return descMeta || '';
    };

    const getImage = (): string | null => {
      const ogImage = getMeta('og:image');
      if (ogImage) return ogImage;
      const twitterImage = getMeta('twitter:image');
      return twitterImage || null;
    };

    const getType = (): string => {
      const ogType = getMeta('og:type');
      if (ogType === 'video.other' || ogType === 'video') return 'video';
      return 'post';
    };

    // Detect platform
    let platform = 'unknown';
    let username: string | null = null;

    for (const [name, patterns] of Object.entries(platformPatterns)) {
      if (patterns.urlPattern.test(url)) {
        platform = name;
        const usernameMatch = url.match(patterns.usernamePattern);
        if (usernameMatch) {
          username = usernameMatch[1];
        }
        break;
      }
    }

    return {
      title: getTitle(),
      description: getDescription().substring(0, 300),
      image: getImage(),
      type: getType(),
      platform,
      username,
      url
    };
  } catch (error) {
    console.error('Scrape error:', error);
    return null;
  }
}

async function verifyUrl(url: string): Promise<{ valid: boolean; status: number; platform: string; contentType: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': USER_AGENT,
      }
    });

    let platform = 'unknown';
    let contentType = 'post';

    for (const [name, patterns] of Object.entries(platformPatterns)) {
      if (patterns.urlPattern.test(url)) {
        platform = name;
        contentType = patterns.contentType(url);
        break;
      }
    }

    return {
      valid: response.ok,
      status: response.status,
      platform,
      contentType
    };
  } catch {
    return {
      valid: false,
      status: 0,
      platform: 'unknown',
      contentType: 'post'
    };
  }
}

async function getAutocomplete(query: string, platform?: string): Promise<string[]> {
  const suggestions: string[] = [];

  // Platform-specific suggestions
  if (platform && query) {
    const prefix = `site:${platform}.com ${query}`;
    suggestions.push(prefix);
    suggestions.push(`"${query}" ${platform}`);
    suggestions.push(`${query} ${platform} post`);
    suggestions.push(`${query} ${platform} video`);
    suggestions.push(`${query} ${platform} story`);
  } else if (query) {
    // Generic suggestions
    suggestions.push(`site:instagram.com ${query}`);
    suggestions.push(`site:tiktok.com ${query}`);
    suggestions.push(`site:snapchat.com ${query}`);
  }

  // Add username suggestions
  if (query.includes('@')) {
    const username = query.replace('@', '');
    suggestions.push(`instagram.com/${username}`);
    suggestions.push(`tiktok.com/@${username}`);
    suggestions.push(`snapchat.com/add/${username}`);
  }

  return suggestions.slice(0, 8);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: SearchRequest = await req.json();

    switch (body.action) {
      case 'search': {
        if (!body.query) {
          return new Response(
            JSON.stringify({ error: 'Query is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build search query
        let searchQuery = body.query;

        // If platform specified, add site: prefix
        if (body.platform && body.platform !== 'all') {
          searchQuery = `site:${body.platform}.com ${searchQuery}`;
        }

        // If username specified, add it
        if (body.username) {
          searchQuery = `${searchQuery} @${body.username.replace('@', '')}`;
        }

        const results = await duckDuckGoSearch(searchQuery);

        return new Response(
          JSON.stringify({ results, query: searchQuery }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'scrape': {
        if (!body.url) {
          return new Response(
            JSON.stringify({ error: 'URL is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await scrapeUrl(body.url);

        return new Response(
          JSON.stringify({ result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'autocomplete': {
        const suggestions = await getAutocomplete(body.query || '', body.platform);

        return new Response(
          JSON.stringify({ suggestions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        if (!body.url) {
          return new Response(
            JSON.stringify({ error: 'URL is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await verifyUrl(body.url);

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
