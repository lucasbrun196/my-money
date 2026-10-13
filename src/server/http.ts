import "server-only";

/** Erro de uma API externa, com mensagem amigável para exibir no card. */
export class UpstreamError extends Error {
  constructor(
    public readonly service: string,
    message: string,
    public readonly status?: number,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

type FetchJsonInit = RequestInit & { timeoutMs?: number };

/**
 * fetch + JSON com timeout (uma API lenta não pode travar a página) e
 * extração da mensagem de erro do corpo da resposta.
 */
export async function fetchJson<T>(service: string, url: string, init: FetchJsonInit = {}): Promise<T> {
  const { timeoutMs = 15_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new UpstreamError(service, `${service}: tempo esgotado (${Math.round(timeoutMs / 1000)} s)`);
    }
    // O fetch do Node guarda a causa real em err.cause (ex.: ENOTFOUND = DNS, ECONNRESET, certificado).
    const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
    const detail = cause?.code ?? cause?.message;
    const hint =
      cause?.code === "ENOTFOUND"
        ? " — o endereço não foi encontrado (DNS/sem internet)"
        : /CERT|SSL|TLS|VERIFY|SIGNATURE|SELF_SIGNED/i.test(detail ?? "")
          ? " — certificado não confiável: algum firewall/antivírus está inspecionando o HTTPS (comum em rede ou notebook corporativo)"
          : "";
    throw new UpstreamError(service, `${service}: falha de rede${detail ? ` (${detail})` : ""}${hint}`);
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const obj = (body ?? {}) as { msg?: string; message?: string; code?: string | number };
    // Páginas de erro em HTML (ex.: 502 do Banco Central) viram uma mensagem curta.
    const isHtml = typeof body === "string" && /^\s*</.test(body);
    const msg =
      obj.msg ??
      obj.message ??
      (isHtml ? "serviço temporariamente indisponível" : typeof body === "string" ? body.slice(0, 200) : res.statusText);
    throw new UpstreamError(service, `${service} (${res.status}): ${msg}`, res.status, obj.code);
  }
  return body as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
