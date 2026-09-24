export const MAX_SERVICE_BODY_BYTES = 32 * 1024 * 1024;

export class ServiceBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large.");
    this.name = "ServiceBodyTooLargeError";
  }
}

/**
 * Build a request that is safe to pass to a service binding.
 *
 * Passing the incoming request through, then returning before its body is
 * read, makes workerd throw "Can't read from request stream after response
 * has been sent." The incoming stream is finished here, and the binding
 * receives an independent request.
 */
export async function serviceRequest(request: Request, maxBytes = MAX_SERVICE_BODY_BYTES): Promise<Request> {
  const method = request.method.toUpperCase();
  const headers = new Headers(request.headers);
  const init: RequestInit = { method, headers, redirect: "manual" };
  if (!request.body) return new Request(request.url, init);

  const declared = Number(headers.get("content-length") || 0);
  const overDeclared = Number.isFinite(declared) && declared > maxBytes;
  if (method === "GET" || method === "HEAD" || overDeclared) {
    await finishBody(request.body, overDeclared ? 0 : maxBytes);
    if (overDeclared) throw new ServiceBodyTooLargeError();
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    return new Request(request.url, init);
  }

  const body = await readBody(request.body, maxBytes);
  headers.delete("transfer-encoding");
  headers.set("content-length", String(body.byteLength));
  return new Request(request.url, { ...init, body });
}

async function finishBody(body: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = body.getReader();
  let total = 0;
  let tooLarge = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (!tooLarge && maxBytes > 0 && total > maxBytes) tooLarge = true;
    }
  } finally {
    reader.releaseLock();
  }
  if (tooLarge) throw new ServiceBodyTooLargeError();
}

async function readBody(body: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let tooLarge = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        tooLarge = true;
        continue;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (tooLarge) throw new ServiceBodyTooLargeError();
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
