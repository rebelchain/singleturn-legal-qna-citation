import { config } from "dotenv";
import { google } from "@ai-sdk/google";
import { generateText, tool, type ModelMessage } from "ai";
import { z } from "zod";

config();

const model = google("gemini-2.5-flash");

async function fetchCorpusData({
  query,
  jenis,
}: {
  query: string;
  jenis: "uu" | "pp" | "perpres" | "permen" | "semua";
}) {
  console.log(`\nTool executed: Query: "${query}", Jenis: ${jenis}`);
  return {
    results: [
      {
        pasal: "156",
        uu: "UU No. 13 Tahun 2003",
        ayat: "1",
        teks: "Dalam hal terjadi pemutusan hubungan kerja, pengusaha diwajibkan membayar uang pesangon dan/atau uang penghargaan masa kerja dan uang penggantian hak yang seharusnya diterima.",
        url: "https://jagahukum.id/uu/13/2003/pasal-156",
      },
    ],
  };
}

const rawSearchCorpusTool = tool({
  description:
    "Cari pasal atau regulasi dalam Corpus hukum Indonesia. SELALU gunakan tool ini sebelum menjawab pertanyaan tentang bunyi pasal atau isi regulasi — jangan menjawab dari memori.",
  inputSchema: z.object({
    query: z.string().describe("Query pencarian dalam Bahasa Indonesia"),
    jenis: z.enum(["uu", "pp", "perpres", "permen", "semua"]).default("semua"),
  }),
});

const SYSTEM_PROMPT = `Kamu adalah asisten hukum Indonesia. 
WAJIB: Selalu gunakan tool searchCorpus sebelum menjawab pertanyaan tentang isi pasal atau regulasi.
WAJIB: Setiap jawaban harus menyertakan sitasi lengkap: "Pasal X ayat (Y) UU No. Z Tahun W".
DILARANG: Jangan menjawab dari memori untuk pertanyaan tentang bunyi pasal spesifik.`;

const PROMPT_USER =
  "Apa bunyi pasal tentang pesangon PHK dalam UU Ketenagakerjaan?";

async function runRawAgent() {
  console.log("\nRunning raw agent");
  const messages: ModelMessage[] = [{ role: "user", content: PROMPT_USER }];
  let isDone = false;

  while (!isDone) {
    const result = await generateText({
      model,
      tools: { searchCorpus: rawSearchCorpusTool },
      system: SYSTEM_PROMPT,
      messages,
    });

    messages.push(...result.response.messages);

    if (result.finishReason === "tool-calls") {
      console.log("[Siklus] Model memilih tool (stop_reason: tool_use)");

      for (const toolCall of result.toolCalls) {
        if (!toolCall.dynamic && toolCall.toolName === "searchCorpus") {
          const output = await fetchCorpusData(toolCall.input);

          messages.push({
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                output: {
                  type: "json",
                  value: output,
                },
              },
            ],
          });
        }
      }
    } else if (result.finishReason === "stop") {
      console.log("[Siklus] Model berhenti (stop_reason: end_turn)");
      console.log("\n[Hasil Raw Agent]:\n", result.text);
      isDone = true;
    } else {
      console.log(
        `[Siklus] Berhenti dengan alasan lain: ${result.finishReason}`,
      );
      isDone = true;
    }
  }
}

runRawAgent().catch(console.error);
