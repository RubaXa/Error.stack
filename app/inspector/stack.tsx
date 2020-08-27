import type {StackRow} from '@mail-core/logger/error/stack/stack';
import type {LegacyLogError} from '@mail-core/logger/legacy/log';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import beautify from 'js-beautify';
import React from 'react';

import {Loading} from '../loading/loading';
import {canInspected} from './util';

hljs.registerLanguage('javascript', javascript);

export type StackProps = {
	error?: LegacyLogError | null;
};

export function Stack(props: StackProps) {
	const {error} = props;

	if (!error || !canInspected(error)) {
		return (
			<div className="stack">
				<div className="stack-unavailable">
					<h3>Unavailable to browse source.</h3>
					{error && <div>{error.source}</div>}
				</div>
			</div>
		);
	}

	return (
		<div className="stack">
			{error.parsedStack.map((frame, i) => (
				<StackFrame
					key={i}
					err={error}
					frame={frame}
					prevFrame={error.parsedStack[i - 1]}
					defaultActive={i === 0}
				/>
			))}
		</div>
	);
}

type StackFrameProps = {
	err: LegacyLogError;
	frame: StackRow;
	prevFrame?: StackRow;
	defaultActive: boolean;
};

function StackFrame(props: StackFrameProps) {
	const {frame, defaultActive} = props;
	const disabled = !(frame && frame.line && /^(https?:)?\//.test(frame.file));
	const [active, toggleActive] = React.useState(defaultActive);

	return (
		<div className={`stack-frame ${active && 'active'}`} aria-disabled={disabled}>
			<div
				className="stack-frame-info flex"
				onClick={() => {
					toggleActive(!active);
				}}
			>
				<div className="error-list-entry-fn">{frame.fn}</div>
				<div className="arr-sep" />
				{frame.file}:{frame.line}:{frame.column}
			</div>

			{active &&
				(disabled ? (
					<div className="stack-unavailable">
						<h3>Unavailable to browse source.</h3>
						<div>{frame.raw}</div>
					</div>
				) : (
					<StackFrameSource {...props} />
				))}
		</div>
	);
}

function StackFrameSource({frame, err, prevFrame}: StackFrameProps) {
	const source = useSource(frame.file);
	const sourceRef = React.useRef(null as HTMLDivElement | null);
	const html = (source.ok && normSource(source.raw || '', err, frame, prevFrame)) || '';

	React.useEffect(() => {
		if (sourceRef.current) {
			sourceRef.current.querySelector('.bug-line')?.scrollIntoView();
			window.scrollTo(0, window.scrollY - window.innerHeight / 3);
		}
	}, [html]);

	return (
		<div className="stack-frame-source" ref={sourceRef}>
			{source.unavailable && (
				<div className="source-unavailable">
					<h3>Unavailable to browse source.</h3>
					<div>{frame.file}</div>
				</div>
			)}

			{source.ok && <pre dangerouslySetInnerHTML={{__html: html}} />}
			{source.loading && (
				<div className="stack-frame-source-loading">
					<Loading />
				</div>
			)}
		</div>
	);
}

const N_SOURCE = {} as Record<string, string>;

function normSource(source: string, err: LegacyLogError, row: StackRow, prevRow?: StackRow) {
	let formatted = N_SOURCE[row.raw];

	if (!formatted) {
		console.log('Normalize source', row);
		console.time('beautify');

		const lines = source.split('\n');
		const line = row.line - 1;

		lines[line] = wrapBugLine(lines[line], row);

		const range = row.column > 1e4 ? 1 : row.column > 1e3 ? 5 : 30;
		const frag = lines.slice(Math.max(line - range, 0), line + range);

		if (frag.some((f) => /^\s*\*/.test(f))) {
			frag[0] = `/*${frag[0]}`;
		}

		formatted = beautify.js(frag.join('\n'), {
			indent_size: 2,
			indent_char: ' ',
			max_preserve_newlines: 5,
			preserve_newlines: true,
			keep_array_indentation: false,
			break_chained_methods: false,
			brace_style: 'collapse',
			space_before_conditional: true,
			unescape_strings: false,
			jslint_happy: false,
			end_with_newline: false,
			wrap_line_length: 0,
			indent_empty_lines: false,
		});
		console.timeEnd('beautify');

		console.time('highlight');
		formatted = hljs.highlight('javascript', formatted).value;
		console.timeEnd('highlight');

		formatted = addBugHL(formatted, row, prevRow);

		if (err?.message) {
			const msg = err.message.split(':').slice(1).join(':').trim();
			const obj = msg.match(/'[a-z.]+'/i);

			formatted = formatted.replace(msg, `<div class="bug-msg">${msg}</div>`);

			if (obj) {
				formatted = formatted.replace(obj[0], `<div class="bug-msg">${obj[0]}</div>`);
			}
		}

		N_SOURCE[row.raw] = formatted;
	}

	return formatted;
}

// const PROXY = 'https://corsproxy.openode.io/';
const PROXY_LIST = ['http://localhost:8080/', 'https://corsproxy.openode.io/'];
let PROXY = null as Promise<string> | null;

function fetchProxy(url: string) {
	if (PROXY === null) {
		PROXY = new Promise((resolve) => {
			PROXY_LIST.forEach((url) => {
				fetch(`${url}https://google.com/`).then((res) => {
					if (res.headers.get('expires') === '-1') {
						console.log('PROXY OK:', url);
						resolve(url);
					}
				});
			});
		});
	}

	return PROXY.then((purl) => fetch(`${purl}${url}`));
}

function useSource(val: string) {
	const url = normUrl(val);
	const [store, setStore] = React.useState(
		{} as Record<
			string,
			| undefined
			| {
					unavailable?: boolean;
					ok?: boolean;
					loading?: boolean;
					raw?: string;
			  }
		>,
	);
	let source = store[url];

	if (!source) {
		source = {unavailable: !/^(https?:|\/\/)/.test(val)};
		source.loading = !source.unavailable;

		setStore({
			...store,
			[url]: source,
		});

		if (!source.unavailable) {
			console.time(url);
			fetchProxy(url)
				.then((r) => r.text())
				.then((raw) => {
					const ok = !!raw && !/^Error/.test(raw);

					console.timeEnd(url);

					setStore({
						...store,
						[url]: {
							...source,
							loading: false,
							ok,
							unavailable: !ok,
							raw,
						},
					});
				})
				.catch(() => {
					setStore({
						...store,
						[url]: {
							...source,
							loading: false,
							unavailable: true,
						},
					});
				});
		}
	}

	return source;
}

function normUrl(val: string) {
	if (!/^http/.test(val)) {
		val = `https:${val}`;
	}

	return val.split('?')[0];
}

function wrapBugLine(bugLine: string, {column}: StackRow) {
	const offset = column - 1;

	if (!bugLine) {
		return bugLine;
	}

	if (offset >= 0) {
		let before = `${bugLine.substr(0, offset)}/*!B*/`;
		let after = bugLine.substr(offset).replace(/^(\.?[_0-9a-z.]+\b)/i, '$1/*B!*/');
		let x = before.lastIndexOf('){', Math.max(before.length - 80, 0));

		x = x > 0 ? x + 2 : 0;
		before = `${before.substr(0, x)}/*!BUG*/${before.substr(x)}`;

		x = after.indexOf('},', 50);
		x = x > 0 ? x : after.length;
		after = `${after.substr(0, x)}/*BUG!*/${after.substr(x)}`;

		bugLine = before + after;
	} else {
		const commentIdx = bugLine.search(/\/[*/]/);

		if (commentIdx > -1) {
			bugLine = `/*!BUG*/${bugLine.substr(0, commentIdx)}/*BUG!*/${bugLine.substr(commentIdx)}`;
		} else {
			bugLine = `/*!BUG*/${bugLine}/*BUG*/`;
		}
	}

	return bugLine;
}

function addBugHL(code: string, {column, fn}: StackRow, prevRow?: StackRow) {
	const callFn = ((prevRow && prevRow.fn) || fn).split(/[/.]/).pop();
	const inFn = fn.split(/[/.]/).pop();
	const replacer = (_: string, bug: string) => {
		if (column >= 0) {
			bug = bug.replace(
				/(?:([.\]])\s+)?<span class="hljs-comment">\/\*!B\*\/<\/span>([\s\S]+)<span class="hljs-comment">\/\*B!\*\/<\/span>\s*/,
				(_, sep, bug) => `${sep || ''}<span class="bug">${bug.trim()}</span>`,
			);
		}

		if (inFn) {
			bug = bug.replace(new RegExp(`(\\b${inFn}:)`, 'gm'), '<span class="bug-fn-in">$1</span>');
		}

		if (callFn) {
			bug = bug.replace(new RegExp(`(\\b${callFn}\\b)`, 'gm'), '<span class="bug-fn">$1</span>');
		}

		// bug = bug.trim();

		return `<div class="bug-line">${bug}</div>`;
	};

	return code.replace(
		/<span class="hljs-comment">\/\*!BUG\*\/<\/span>([\s\S]+)<span class="hljs-comment">\/\*BUG!\*\/<\/span>/,
		replacer,
	);
}
