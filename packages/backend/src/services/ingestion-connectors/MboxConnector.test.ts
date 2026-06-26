import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { EmailObject } from '@open-archiver/types';

const createMboxMessage = (
	id: string,
	subject: string
) => `From ${id}@example.local Fri Jan 01 00:00:00 2021
Message-ID: <${id}@example.local>
From: ${id} <${id}@example.local>
To: archive <archive@example.local>
Subject: ${subject}
Date: Fri, 01 Jan 2021 00:00:00 +0000

Hello from ${subject}.
`;

describe('MboxConnector', () => {
	let tempDirs: string[] = [];

	afterEach(async () => {
		vi.unstubAllEnvs();
		vi.resetModules();
		await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
		tempDirs = [];
	});

	it('imports .mbox files recursively from a local folder', async () => {
		const importRoot = await mkdtemp(join(tmpdir(), 'oa-mbox-import-'));
		const storageRoot = await mkdtemp(join(tmpdir(), 'oa-mbox-storage-'));
		tempDirs.push(importRoot, storageRoot);

		const nestedFolder = join(importRoot, 'Clients');
		await mkdir(nestedFolder, { recursive: true });
		await writeFile(join(importRoot, 'Inbox.mbox'), createMboxMessage('inbox', 'Inbox'));
		await writeFile(join(nestedFolder, 'Acme.mbox'), createMboxMessage('acme', 'Acme'));
		await writeFile(join(nestedFolder, 'notes.txt'), 'not an mbox');

		vi.stubEnv('STORAGE_TYPE', 'local');
		vi.stubEnv('STORAGE_LOCAL_ROOT_PATH', storageRoot);
		vi.stubEnv('LOG_LEVEL', 'silent');
		vi.resetModules();

		const { MboxConnector } = await import('./MboxConnector');
		const connector = new MboxConnector({
			type: 'mbox_import',
			localFilePath: importRoot,
		});
		const emails: EmailObject[] = [];

		await expect(connector.testConnection()).resolves.toBe(true);

		try {
			for await (const email of connector.fetchEmails('archive@example.local')) {
				if (email) {
					emails.push(email);
				}
			}

			expect(emails).toHaveLength(2);
			expect(emails.map((email) => email.path).sort()).toEqual(['Clients/Acme', 'Inbox']);
			expect(emails.map((email) => email.subject).sort()).toEqual(['Acme', 'Inbox']);
		} finally {
			await Promise.all(emails.map((email) => rm(email.tempFilePath, { force: true })));
		}
	});
});
