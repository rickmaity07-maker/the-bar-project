import { ImapFlow } from "imapflow";

export interface ReceivedMail {
  subject: string;
  to: string;
  replyTo: string;
  source: string;
}

/* Quoted-printable soft line breaks and encoded characters, undone well enough to search the text. */
function decode(source: string) {
  return source
    .replace(/=\r?\n/g, "")
    .replace(/(?:=[0-9A-F]{2})+/g, (match) => {
      try {
        return Buffer.from(match.replace(/=/g, ""), "hex").toString("utf8");
      } catch {
        return match;
      }
    });
}

/*
  Reads the real Gmail inbox over IMAP (the same App Password the site sends
  with) and waits until `expected` messages whose subject contains `tag` arrived.
*/
export async function waitForMail(tag: string, expected: number, timeoutMs = 120_000): Promise<ReceivedMail[]> {
  const deadline = Date.now() + timeoutMs;
  let found: ReceivedMail[] = [];
  while (Date.now() < deadline) {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: process.env.GMAIL_USER ?? "", pass: process.env.GMAIL_APP_PASSWORD ?? "" },
      logger: false,
    });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const ids = (await client.search({ subject: tag, since: new Date(Date.now() - 86_400_000) })) || [];
      found = [];
      for (const id of ids) {
        const message = await client.fetchOne(String(id), { envelope: true, source: true });
        if (!message || !message.envelope) continue;
        found.push({
          subject: message.envelope.subject ?? "",
          to: message.envelope.to?.map((a) => a.address).join(",") ?? "",
          replyTo: message.envelope.replyTo?.map((a) => a.address).join(",") ?? "",
          source: decode(message.source?.toString("utf8") ?? ""),
        });
      }
    } finally {
      lock.release();
      await client.logout();
    }
    if (found.length >= expected) return found;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return found;
}
