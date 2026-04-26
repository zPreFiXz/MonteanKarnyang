const config = require("./config");

const MAX_RETRIES = 1;

const NETWORK_ERROR_CODES = new Set(["ENOTFOUND", "ECONNREFUSED", "ECONNRESET"]);

const isRetryable = (error) =>
  error?.name === "AbortError" || NETWORK_ERROR_CODES.has(error?.code);

const sendToChat = async (chatId, text, attempt = 0) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.telegram.requestTimeoutMs);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (error) {
    if (attempt < MAX_RETRIES && isRetryable(error)) {
      return sendToChat(chatId, text, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const splitText = (text) => {
  const limit = config.telegram.textLimit;
  if (!text) return ["-"];
  if (text.length <= limit) return [text];

  const chunks = [];
  let current = "";

  for (const line of text.split("\n")) {
    const next = current ? `${current}\n${line}` : line;

    if (next.length <= limit) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (line.length <= limit) {
      current = line;
    } else {
      for (let i = 0; i < line.length; i += limit) {
        chunks.push(line.slice(i, i + limit));
      }
      current = "";
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : ["-"];
};

const send = async (message) => {
  const { botToken, chatIds } = config.telegram;

  if (!botToken || !chatIds.length) {
    console.warn("Skipped: Missing BOT_TOKEN or CHAT_IDS");
    return;
  }

  const text = typeof message === "string" ? message : JSON.stringify(message) ?? "";
  const chunks = splitText(text);

  const results = await Promise.allSettled(
    chatIds.map(async (chatId) => {
      for (const chunk of chunks) {
        await sendToChat(chatId, chunk);
      }
    }),
  );

  const failures = results
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason?.message || String(r.reason));

  if (failures.length) {
    const msg = `Send failed (${chatIds.length - failures.length}/${chatIds.length} succeeded): ${failures.join(" | ")}`;
    console.error(msg);
    throw new Error(msg);
  }
};

module.exports = { send };
