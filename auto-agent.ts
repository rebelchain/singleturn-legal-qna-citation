import { google } from "@ai-sdk/google";
import { generateText, stepCountIs, tool } from "ai";
import { config } from "dotenv";
import { z } from "zod";

config();

const model = google("gemini-2.5-flash");

const autoSearchCorpusTool = tool({
  description:
    "Cari pasal atau regulasi dalam Corpus hukum Indonesia. SELALU gunakan tool ini sebelum menjawab pertanyaan tentang bunyi pasal atau isi regulasi — jangan menjawab dari memori.",
  inputSchema: z.object({
    query: z.string().describe("Query pencarian dalam Bahasa Indonesia"),
    jenis: z.enum(["uu", "pp", "perpres", "permen", "semua"]).default("semua"),
  }),

  execute: async ({ query, jenis }) => {
    console.log(`\nAuto Tool Executed: Query: "${query}", Jenis: ${jenis}`);

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
  },
});

const SYSTEM_PROMPT = `Kamu adalah asisten hukum Indonesia. 
WAJIB: Selalu gunakan tool searchCorpus sebelum menjawab pertanyaan tentang isi pasal atau regulasi.
WAJIB: Setiap jawaban harus menyertakan sitasi lengkap: "Pasal X ayat (Y) UU No. Z Tahun W".
DILARANG: Jangan menjawab dari memori untuk pertanyaan tentang bunyi pasal spesifik.`;

const PROMPT_USER =
  "Apa bunyi pasal tentang pesangon PHK dalam UU Ketenagakerjaan?";

async function runAutomatedAgent() {
  console.log("\nRunning automated agent");

  const result = await generateText({
    model,
    tools: { searchCorpus: autoSearchCorpusTool },
    system: SYSTEM_PROMPT,
    prompt: PROMPT_USER,
    stopWhen: stepCountIs(5),

    // Opsional: Callback untuk mengintip apa yang terjadi di tiap iterasi/step
    onStepFinish({ finishReason, toolCalls }) {
      console.log(
        `[Step Selesai] finishReason: "${finishReason}", jumlah tool dipanggil: ${toolCalls.length}`,
      );
    },
  });

  console.log("\nHasil:\n", result.text);
  console.log(`\nTotal steps yang ditempuh: ${result.steps.length}`);
}

runAutomatedAgent().catch(console.error);
