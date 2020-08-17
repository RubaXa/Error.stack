import type {StackRow} from '@mail-core/logger/error/stack/stack';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import beautify from 'js-beautify';
import React from 'react';

import {Loading} from '../loading/loading';
import {LegacyLog, LegacyLogEntry, parseLog} from '../log/log';

export type InspectorProps = {
	rawLog: string;
};

hljs.registerLanguage('javascript', javascript);
(window as any).hljs = hljs;

export function Inspector(props: InspectorProps) {
	const [log, setLog] = React.useState([] as LegacyLog);
	const [entryIdx, setActiveEntryIdx] = React.useState(0);
	const [stackIdx, setActiveStackIdx] = React.useState(0);
	const [entriesExpanded, setEntriesExpand] = React.useState(false);
	const toggleExpanded = React.useCallback(() => {
		setEntriesExpand(!entriesExpanded);
	}, [entriesExpanded]);
	const activeEntry = log[entryIdx] as LegacyLogEntry | undefined;
	const activeStack = activeEntry?.msg?.err?.stack?.parsed;
	const activeStackRow = activeStack?.[stackIdx] as StackRow | undefined;

	React.useEffect(() => {
		const uniq = {} as any;
		const log = parseLog(props.rawLog).filter((e) => {
			const key = `${e.msg?.err?.source}:${e.msg?.err?.line}:${e.msg?.err?.col}`;

			if (!uniq[key]) {
				uniq[key] = true;
				return e.msg?.err?.stack?.parsed?.some(isCorrentStackRow);
			}
			return false;
		});

		setLog(log);
		setActiveEntryIdx(0);
		setActiveStackIdx(0);
	}, [props.rawLog]);

	React.useEffect(() => {
		console.log('activeEntry:', activeEntry);
	}, [activeEntry]);

	return (
		<div className="inspector">
			<div className="entries">
				<div className="entry-active" onClick={toggleExpanded}>
					{activeEntry?.msg?.err?.message}
				</div>

				{entriesExpanded && (
					<div className="entries-selector">
						{log.map((entry, idx) => (
							<div
								key={idx}
								className={`entries-selector-item ${entryIdx === idx}`}
								onClick={() => {
									setActiveEntryIdx(idx);
									toggleExpanded();
								}}
							>
								{entry.msg?.err?.message}
								<small>{entry.msg?.err?.source}</small>
							</div>
						))}
					</div>
				)}

				{!entriesExpanded && (
					<div className="entry-stack-row" onClick={toggleExpanded}>
						{activeStackRow?.raw}
					</div>
				)}
			</div>

			{!entriesExpanded && (
				<div className="stack">
					{activeEntry?.msg?.err?.stack?.parsed?.map((row, idx) => (
						<div
							key={idx}
							className={`
						stack-row
						stack-row-${isCorrentStackRow(row)}
						${stackIdx === idx}
					`}
							onClick={() => {
								setActiveStackIdx(idx);
							}}
						>
							{row.raw.trim()}
						</div>
					))}
				</div>
			)}

			{activeStackRow && (
				<Source
					err={activeEntry?.msg?.err}
					row={activeStackRow}
					prevRow={activeStack?.[stackIdx - 1]}
				/>
			)}
		</div>
	);
}

function isCorrentStackRow(row?: StackRow): row is StackRow {
	return !!(row && row.line && /^(https?:)?\//.test(row.file));
}

type SourceProps = {
	row: StackRow;
	prevRow?: StackRow;
	err: NonNullable<LegacyLogEntry['msg']>['err'];
};

function Source({row, err, prevRow}: SourceProps) {
	const source = useSource(row.file);
	const sourceRef = React.useRef(null as HTMLDivElement | null);
	const html = (source.ok && normSource(source.raw || '', err, row, prevRow)) || '';

	React.useEffect(() => {
		if (sourceRef.current) {
			sourceRef.current.querySelector('.bug-line')?.scrollIntoView();
			window.scrollTo(0, window.scrollY - window.innerHeight / 3);
		}
	}, [html]);

	return (
		<div className="source" ref={sourceRef}>
			{source.unavailable && (
				<div className="source-unavailable">
					<h3>Unavailable to browse source.</h3>
					<div>{row.file}</div>
				</div>
			)}

			{source.ok && <pre dangerouslySetInnerHTML={{__html: html}} />}
			{source.loading && (
				<div className="source-loading">
					<Loading />
				</div>
			)}
		</div>
	);
}

const N_SOURCE = {} as Record<string, string>;

function normSource(
	source: string,
	err: NonNullable<LegacyLogEntry['msg']>['err'],
	row: StackRow,
	prevRow?: StackRow,
) {
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
