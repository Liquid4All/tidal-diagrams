import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";
/** Anthropic vision guidance: best results at or below 1568px on the long edge. */
const MAX_IMAGE_EDGE = 1568;

const TRANSCRIBE_PROMPT = `Transcribe the diagram in this image into Mermaid flowchart syntax, using ONLY this subset:

- First line: "flowchart LR" or "flowchart TB" (match the image's main flow direction)
- Nodes: id[Label] for boxes; id["Title<br/>Second line"] when a box has a title plus a description line; id[(Label)] for database/cylinder shapes; id([Label]) for small pill or stadium-shaped labels
- Edges: a --> b solid arrow; a -->|label text| b arrow with a label; a -.-> b dotted arrow; a --- b line without an arrowhead
- Containers/boxes drawn around groups of nodes: subgraph groupid [Group title] ... end

Rules:
- Use short lowercase ids (collector, scores, db1)
- Every visible node, edge, edge label, and container must appear exactly once; do not invent elements that are not in the image
- Preserve the text verbatim, including capitalization
- Do not use classDef, style, linkStyle, click, comments, or any syntax outside the subset above
- Output ONLY the Mermaid code. No code fences, no explanation.`;

export interface ImageImportResult {
  mermaid: string;
}

/** Downscale + encode a user image as PNG base64 (strips the data-URL prefix). */
export async function prepareImage(file: File): Promise<{ data: string; mediaType: "image/png" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // white backdrop so transparent screenshots don't become black
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/png");
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/png" };
}

/** Ask Claude to transcribe a diagram image into our Mermaid subset. */
export async function imageToMermaid(apiKey: string, file: File): Promise<ImageImportResult> {
  const { data, mediaType } = await prepareImage(file);

  // The key never leaves the browser except to Anthropic directly.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to process this image.");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // Strip code fences in case the model added them anyway.
  const mermaid = text.replace(/^```(?:mermaid)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  if (!mermaid) throw new Error("The model returned no diagram code.");
  return { mermaid };
}

export function describeApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Invalid API key. Check it in the Anthropic Console (it should start with sk-ant-).";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the API — wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `API error ${err.status ?? ""}: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}
