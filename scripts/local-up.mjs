#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
const withTika = args.has('--with-tika');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const setupScript = resolve(scriptDir, 'setup-local-env.mjs');
const setupArgs = [setupScript, '--if-missing'];

if (withTika) {
	setupArgs.push('--with-tika');
}

const composeCommand = findComposeCommand();

const setup = spawnSync(process.execPath, setupArgs, {
	cwd: process.cwd(),
	stdio: 'inherit',
});

if (setup.error) {
	console.error(`Failed to prepare local environment: ${setup.error.message}`);
	process.exit(1);
}

if (setup.status !== 0) {
	process.exit(setup.status ?? 1);
}

const composeArgs = withTika ? ['--profile', 'tika', 'up', '-d'] : ['up', '-d'];
const compose = spawnSync(composeCommand.command, [...composeCommand.prefixArgs, ...composeArgs], {
	cwd: process.cwd(),
	stdio: 'inherit',
});

if (compose.error) {
	console.error(`Failed to start Docker Compose: ${compose.error.message}`);
	process.exit(1);
}

if (compose.status !== 0) {
	console.error(
		'Docker Compose did not start successfully. Make sure Docker Desktop is open, or that the Docker Engine service is running, then try npm run local:up again.'
	);
}

process.exit(compose.status ?? 0);

function findComposeCommand() {
	const dockerCompose = spawnSync('docker', ['compose', 'version'], {
		cwd: process.cwd(),
		encoding: 'utf8',
	});
	if (!dockerCompose.error && dockerCompose.status === 0) {
		return { command: 'docker', prefixArgs: ['compose'], label: 'docker compose' };
	}

	const standaloneCompose = spawnSync('docker-compose', ['version'], {
		cwd: process.cwd(),
		encoding: 'utf8',
	});
	if (
		!standaloneCompose.error &&
		standaloneCompose.status === 0 &&
		isComposeVersionOutput(
			`${standaloneCompose.stdout || ''}\n${standaloneCompose.stderr || ''}`
		)
	) {
		return { command: 'docker-compose', prefixArgs: [], label: 'docker-compose' };
	}

	if (dockerCompose.error?.code === 'ENOENT' && standaloneCompose.error?.code === 'ENOENT') {
		console.error(
			'Docker was not found. Install Docker Desktop or Docker Engine with Docker Compose, make sure the docker command is on your PATH, then run npm run local:up again.'
		);
		process.exit(1);
	}

	console.error(
		'Docker is installed, but Docker Compose is not available. Install Docker Compose v2 or Docker Desktop, confirm `docker compose version` works, then run npm run local:up again.'
	);
	process.exit(1);
}

function isComposeVersionOutput(output) {
	return /docker[- ]compose/i.test(output);
}
