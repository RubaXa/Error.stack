import type {ReporterError} from '@mail-core/logger/error/reporter/reporter';
import {parseStack, StackRow} from '@mail-core/logger/error/stack/stack';

const isLikeJSON = /^\s*\{"[\s\S]+\}\s*$/;
const isLikeStack = /\.(js|[a-z]+\/?):\d+:\d+/;

export type LegacyLog = LegacyLogEntry[];
export type LegacyLogError = Omit<ReporterError, 'stack'> & {
	stack?: {
		raw: string;
		parsed?: StackRow[];
	};
};

export type LegacyLogEntry = {
	ts: number;
	us: string;
	email?: string;
	ip: string;
	msg?: {
		meta: {
			os: string[];
			trb: string;
			browser: string[];
			platform: string[];
			navigator: {
				platform: string;
				userAgent: string;
			};
		};
		err?: LegacyLogError;
		tag?: string;
		project?: string;
	};
};

export function parseLog(raw: string): LegacyLog {
	const entries = raw
		.trim()
		.split('\n')
		.map((entry) => {
			try {
				if (!isLikeJSON.test(raw) && isLikeStack.test(raw)) {
					return {
						msg: {
							err: stackToLegacyLogError(raw),
						},
					};
				}
				return parseEntry(entry);
			} catch (err) {
				return {
					err,
					raw: entry.trim(),
				};
			}
		});
	console.log('log.entries:', entries);

	return entries;
}

function parseEntry(raw: any): any {
	if (raw == null) {
		return raw;
	}

	switch (typeof raw) {
		case 'object':
			for (const key in raw) {
				raw[key] = parseEntry(raw[key]);
			}
			return raw;

		case 'string':
			if (isLikeJSON.test(raw)) {
				return parseEntry(JSON.parse(raw.trim()));
			} else if (isLikeStack.test(raw)) {
				return {
					raw,
					parsed: parseStack(raw),
				};
			}

			return raw;
	}

	return raw;
}

function stackToLegacyLogError(raw: string): LegacyLogError {
	const [msg] = raw.match(/(?:^|Error:\s+)(\w[^\n]+)/) || [];
	const [, name] = raw.match(/([A-Z][a-z]+Error):/) || ['', 'Error'];
	const stack = parseStack(raw);
	const row = stack[0];

	console.log(msg);

	return {
		message: `${name}: ${msg || '<<unk>>'}`,
		source: row.file,
		line: row.line,
		col: row.column,
		detail: {},
		name,
		url: '',
		stack: {
			raw,
			parsed: stack,
		},
	};
}
