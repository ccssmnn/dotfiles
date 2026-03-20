import { tool, type Plugin } from "@opencode-ai/plugin";

const maxMessages = 24;
const maxTranscriptLength = 6000;
const maxTitleLength = 80;

type SessionMessage = {
  info?: {
    role?: "user" | "assistant";
  };
  parts?: Array<{
    type?: string;
    text?: string;
    ignored?: boolean;
  }>;
};

function messageText(parts: SessionMessage["parts"]) {
  return (parts ?? [])
    .filter((part) => part.type === "text" && !part.ignored && part.text)
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimTranscript(value: string) {
  if (value.length <= maxTranscriptLength) return value;
  return value.slice(value.length - maxTranscriptLength).trim();
}

function buildTranscript(messages: SessionMessage[]) {
  const transcript = messages
    .map((message) => {
      const role = message.info?.role;
      if (role !== "user" && role !== "assistant") return "";

      const text = messageText(message.parts);
      if (!text) return "";

      const label = role === "user" ? "User" : "Assistant";
      return `${label}: ${text}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return trimTranscript(transcript);
}

function cleanTitle(value: string) {
  return value
    .replace(/^['"`\s]+|['"`\s]+$/g, "")
    .replace(/^[Tt]itle:\s*/, "")
    .replace(/\s+/g, " ")
    .slice(0, maxTitleLength)
    .trim();
}

function fallbackTitle(messages: SessionMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = cleanTitle(messageText(messages[index]?.parts));
    if (text) return text;
  }

  return "Untitled session";
}

function titlePrompt(transcript: string, currentTitle: string) {
  return [
    "Generate a fresh short title for this coding session.",
    "Return title only.",
    "No quotes.",
    "Prefer 2-6 words.",
    `Current title: ${currentTitle || "Untitled session"}`,
    "",
    transcript,
  ].join("\n");
}

async function requestTitle(
  client: Parameters<Plugin>[0]["client"],
  directory: string,
  prompt: string,
  agent?: string,
) {
  const session = await client.session.create({
    body: {
      title: "Title generator",
    },
    query: {
      directory,
    },
  });

  const tempSessionID = session.data.id;

  try {
    const response = await client.session.prompt({
      path: {
        id: tempSessionID,
      },
      query: {
        directory,
      },
      body: {
        ...(agent ? { agent } : {}),
        parts: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    });

    return cleanTitle(messageText(response.data.parts));
  } finally {
    await client.session.delete({
      path: {
        id: tempSessionID,
      },
      query: {
        directory,
      },
    }).catch(() => {});
  }
}

async function generateFreshTitle(
  client: Parameters<Plugin>[0]["client"],
  directory: string,
  sessionID: string,
) {
  const [session, messagesResponse] = await Promise.all([
    client.session.get({
      path: {
        id: sessionID,
      },
      query: {
        directory,
      },
    }),
    client.session.messages({
      path: {
        id: sessionID,
      },
      query: {
        directory,
        limit: maxMessages,
      },
    }),
  ]);

  const messages = messagesResponse.data as SessionMessage[];
  const transcript = buildTranscript(messages);

  if (!transcript) {
    return fallbackTitle(messages);
  }

  const prompt = titlePrompt(transcript, session.data.title);

  try {
    const title = await requestTitle(client, directory, prompt, "title");
    if (title) return title;
  } catch {}

  try {
    const title = await requestTitle(client, directory, prompt);
    if (title) return title;
  } catch {}

  return fallbackTitle(messages);
}

export const SessionTitlePlugin: Plugin = async ({ client, directory }) => {
  return {
    tool: {
      refresh_session_title: tool({
        description: "Generate and apply a fresh session title for the current chat.",
        args: {},
        async execute(_, context) {
          const sessionDirectory = context.directory || directory;
          const title = cleanTitle(await generateFreshTitle(client, sessionDirectory, context.sessionID)) || "Untitled session";

          await client.session.update({
            path: {
              id: context.sessionID,
            },
            query: {
              directory: sessionDirectory,
            },
            body: {
              title,
            },
          });

          context.metadata({
            title: `session title: ${title}`,
            metadata: {
              sessionID: context.sessionID,
              title,
            },
          });

          return `Updated session title to: ${title}`;
        },
      }),
    },
  };
};
