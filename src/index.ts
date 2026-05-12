interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * LibreTranslate MCP — open-source machine translation (BYO endpoint)
 *
 * Important: the free public LibreTranslate instances have largely shut down
 * or migrated to paid plans. This pack is a thin abstraction — you point it
 * at any LibreTranslate-compatible instance:
 *   - self-hosted (https://github.com/LibreTranslate/LibreTranslate)
 *   - paid: https://libretranslate.com (BYO their API key)
 *   - a community instance that's still up
 *
 * API (LibreTranslate v1): https://github.com/LibreTranslate/LibreTranslate#api
 *
 * Tools:
 * - translate:        translate text between languages
 * - detect_language:  detect source language of a text
 * - list_languages:   languages supported by the configured instance
 */


const tools: McpToolExport['tools'] = [
  {
    name: 'translate',
    description:
      'Translate text. Source can be "auto" to auto-detect. Returns translated text and the detected source (if applicable).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        source: { type: 'string', description: 'Source language code or "auto" (default "auto")' },
        target: { type: 'string', description: 'Target language code (e.g., "es", "fr", "ja")' },
        format: { type: 'string', description: 'text (default) | html', enum: ['text', 'html'] },
      },
      required: ['text', 'target'],
    },
  },
  {
    name: 'detect_language',
    description: 'Detect the source language of a piece of text. Returns ranked language candidates with confidence.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
      },
      required: ['text'],
    },
  },
  {
    name: 'list_languages',
    description: 'List languages supported by the configured LibreTranslate instance.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const endpoint = resolveEndpoint(args);
  const apiKey = (args._apiKey as string | undefined)?.trim();

  switch (name) {
    case 'translate':
      return translate(
        endpoint,
        apiKey,
        reqStr(args, 'text', '"hello world"'),
        (args.source as string) ?? 'auto',
        reqStr(args, 'target', '"es"'),
        (args.format as string) ?? 'text',
      );
    case 'detect_language':
      return detectLanguage(endpoint, apiKey, reqStr(args, 'text', '"bonjour le monde"'));
    case 'list_languages':
      return listLanguages(endpoint, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing or empty. Pass a string like ${example}.`);
  }
  return v;
}

function resolveEndpoint(args: Record<string, unknown>): string {
  const ep = (args._endpoint as string | undefined)?.trim();
  if (!ep) {
    throw new Error(
      'LibreTranslate requires a LibreTranslate-compatible endpoint URL. Set it via the gateway PLATFORM_LIBRETRANSLATE_ENDPOINT env var, or pass ?_endpoint=https://your-instance/ on the gateway URL. Public free instances have largely shut down — self-host or use libretranslate.com (paid).',
    );
  }
  return ep.replace(/\/+$/, '');
}

async function ltPost<T>(endpoint: string, path: string, body: Record<string, string>, apiKey?: string): Promise<T> {
  const params = new URLSearchParams(body);
  if (apiKey) params.set('api_key', apiKey);

  const res = await fetch(`${endpoint}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  });
  if (res.status === 401 || res.status === 403) throw new Error('LibreTranslate: unauthorized — check the API key');
  if (res.status === 429) throw new Error('LibreTranslate: rate-limit (HTTP 429)');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LibreTranslate error: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function ltGet<T>(endpoint: string, path: string, apiKey?: string): Promise<T> {
  const url = apiKey ? `${endpoint}${path}?api_key=${encodeURIComponent(apiKey)}` : `${endpoint}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LibreTranslate error: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function translate(
  endpoint: string,
  apiKey: string | undefined,
  text: string,
  source: string,
  target: string,
  format: string,
) {
  const data = await ltPost<{ translatedText?: string; detectedLanguage?: { confidence?: number; language?: string } }>(
    endpoint,
    '/translate',
    { q: text, source, target, format },
    apiKey,
  );
  return {
    text,
    source,
    target,
    format,
    translated_text: data.translatedText ?? null,
    detected_source: data.detectedLanguage?.language ?? null,
    detected_confidence: data.detectedLanguage?.confidence ?? null,
  };
}

async function detectLanguage(endpoint: string, apiKey: string | undefined, text: string) {
  const data = await ltPost<{ language?: string; confidence?: number }[]>(endpoint, '/detect', { q: text }, apiKey);
  return {
    text,
    candidates: (Array.isArray(data) ? data : []).map((d) => ({
      language: d.language ?? null,
      confidence: d.confidence ?? null,
    })),
  };
}

async function listLanguages(endpoint: string, apiKey: string | undefined) {
  const data = await ltGet<{ code?: string; name?: string; targets?: string[] }[]>(endpoint, '/languages', apiKey);
  return {
    count: data.length,
    languages: data.map((l) => ({
      code: l.code ?? null,
      name: l.name ?? null,
      target_codes: l.targets ?? [],
    })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
