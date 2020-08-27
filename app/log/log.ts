import {parseStack} from '@mail-core/logger/error/stack/stack';
import {LegacyLogEntry, LegacyLogError, parseLegacyLog} from '@mail-core/logger/legacy/log';

const isLikeJSON = /^\s*\{"[\s\S]+\}\s*$/;
const isLikeStack = /\.(js|[a-z]+\/?):\d+:\d+/;

export function parseLog(raw: string) {
	if (!isLikeJSON.test(raw) && isLikeStack.test(raw)) {
		return [
			<LegacyLogEntry>{
				msg: {
					err: stackToLegacyLogError(raw),
				},
			},
		];
	}

	return parseLegacyLog(raw);
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
		stack: raw,
		parsedStack: stack,
	};
}
