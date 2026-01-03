import { z } from 'zod';
import { useRuntimeConfig } from 'nitropack/runtime';
import { Logger, ImapFlow } from 'imapflow';
import { readdir } from 'node:fs/promises';

const imapFlowSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }),
  logger: z
    .union([z.literal(false), z.custom<Logger>()])
    .optional()
    .default(false),
});

async function _getIncrementedFilename(filename: string, directory: string) {
  const extensionIndex = filename.lastIndexOf('.');
  const hasExtension = extensionIndex !== -1;
  const normalizedName = hasExtension ? filename.slice(0, extensionIndex) : filename;
  const extension = hasExtension ? filename.slice(extensionIndex) : '';

  const existingFiles = new Set(await readdir(directory));
  if (!existingFiles.has(filename)) return filename;

  let counter = 1;
  let newFilename = `${normalizedName}-${counter}${extension}`;

  while (existingFiles.has(newFilename)) {
    counter++;
    newFilename = `${normalizedName}-${counter}${extension}`;
  }

  return newFilename;
}

/* oxlint-disable no-console */
export function useImapFlow() {
  const runtimeConfig = useRuntimeConfig();
  const imapFlowOptions = imapFlowSchema.parse(runtimeConfig.imapflow);
  const imapFlowClient = new ImapFlow(imapFlowOptions);

  async function getEmails() {
    await imapFlowClient.connect();
    const mailboxLock = await imapFlowClient.getMailboxLock('INBOX');
    const messages = imapFlowClient.fetch('1:*', {
      envelope: true,
      source: true,
      bodyStructure: true,
      uid: true,
    });

    const data = [];

    try {
      for await (const message of messages) {
        if (!message.envelope) continue;

        data.push({
          id: message.envelope.messageId,
          subject: message.envelope.subject,
          from: message.envelope.from,
          to: message.envelope.to,
          date: message.envelope.date,
        });

        // const structure = message.bodyStructure;
        // if (!structure?.childNodes) continue;

        // for (const node of structure.childNodes) {
        //   if (node.disposition !== 'attachment') continue;

        //   const downloaded = await imapFlowClient.download(message.uid, node.part, { uid: true });
        //   const _filename = downloaded.meta.filename ?? Bun.randomUUIDv7();
        //   const filename = await getIncrementedFilename(_filename, './downloads');
        //   const chunks: Buffer[] = [];

        //   for await (const chunk of downloaded.content) {
        //     chunks.push(Buffer.from(chunk));
        //   }

        //   const arrayBuffer = Buffer.concat(chunks);
        //   await Bun.write(`./downloads/${filename}`, arrayBuffer);
        // }
      }
    } catch (error) {
      console.error(error);

      const message = error instanceof Error ? error.message : 'Unknown ImapFlow Error';
      const cause = error instanceof Error ? error.cause : error;
      throw new Error(message, { cause });
    } finally {
      mailboxLock.release();
    }

    await imapFlowClient.logout();
    return data;
  }

  return {
    getEmails,
  };
}
