/* eslint max-lines-per-function:"off", @typescript-eslint/no-unused-expressions:"off" */

import {
	aggregation,
	AggregationEntry,
	AggregationSorted,
	LegacyLogEntry,
	LegacyLogEntryFailed,
} from '@mail-core/logger/legacy/log';
import React from 'react';

export type ErrorListProps = {
	entries: Array<LegacyLogEntry | LegacyLogEntryFailed>;
	onSelect: (entry: AggregationEntry | null) => void;
};

const GROUP_BY = ['message', 'ua', 'ip', 'email', 'url'];

export function ErrorList(props: ErrorListProps) {
	const activeEntryRef = React.useRef(null as HTMLDivElement | null);
	const visitedEntries = React.useRef(new Set<AggregationEntry>());
	const [activeEntry, setActiveEntry] = React.useState(null as AggregationEntry | null);
	const [groupBy, setGroupBy] = React.useState('message');
	const [withStack, setWithStack] = React.useState(true);
	const [withUrl, setWithUrl] = React.useState(false);
	const [withDetail, setWithDetail] = React.useState(false);
	const [aggr, setAggrLog] = React.useState([] as AggregationSorted);
	const selectEntry = React.useCallback(
		(entry: null | AggregationEntry) => {
			entry && visitedEntries.current.add(entry);
			setActiveEntry(entry);
			props.onSelect(entry);
		},
		[setActiveEntry],
	);
	const handleNextError = React.useCallback(() => {
		const idx = aggr.findIndex((entry) => entry[1] === activeEntry);
		selectEntry(aggr[idx + 1] ? aggr[idx + 1][1] : aggr[0][1]);
	}, [activeEntry, setActiveEntry]);

	React.useEffect(() => {
		const aggr = aggregation(props.entries, {
			group: groupBy,
			stack: withStack,
			url: withUrl,
			detail: withDetail,
		});

		setAggrLog(aggr);
	}, [setAggrLog, groupBy, withStack, withUrl, withDetail]);

	React.useEffect(() => {
		if (activeEntryRef.current) {
			activeEntryRef.current.scrollIntoView();
		}
	}, [activeEntry, activeEntryRef.current]);

	return (
		<>
			{!activeEntry && (
				<div className="error-list-toolbar">
					<label className="error-list-toolbar-item">
						Group by:
						<select
							value={groupBy}
							onChange={(evt) => {
								setGroupBy(evt.currentTarget.value);
							}}
						>
							{GROUP_BY.map((v) => (
								<option key={v}>{v}</option>
							))}
						</select>
					</label>

					<label className="error-list-toolbar-item">
						Stack:
						<input
							checked={withStack}
							type="checkbox"
							onChange={() => {
								setWithStack(!withStack);
							}}
						/>
					</label>

					<label className="error-list-toolbar-item">
						URL:
						<input
							checked={withUrl}
							type="checkbox"
							onChange={() => {
								setWithUrl(!withUrl);
							}}
						/>
					</label>

					<label className="error-list-toolbar-item">
						Detail:
						<input
							checked={withDetail}
							type="checkbox"
							onChange={() => {
								setWithDetail(!withDetail);
							}}
						/>
					</label>
				</div>
			)}

			<div className={`${activeEntry && 'error-list-slider'}`}>
				{activeEntry && (
					<div
						className="error-list-nav-ctrl home"
						title="List"
						onClick={() => {
							selectEntry(null);
						}}
					>
						↥
					</div>
				)}

				<div className="error-list">
					{aggr.map(([message, record], idx) => {
						const uniq = record.uniq;
						const uniqErr = uniq.ip === 1;
						let ts = null as string | null;
						let email = null as string | null;
						let ip = null as string | null;
						let msg = message;

						if (groupBy !== 'message' || withUrl || uniqErr) {
							const entry = Object.values(record.detail)[0].entry;

							msg = entry.msg.err.message;

							if (groupBy !== 'message' || uniqErr) {
								ts = new Date((entry.ts + 3 * 60 * 60) * 1000).toISOString();

								if (groupBy !== 'message' || uniqErr) {
									ip = entry.ip || '<<no ip>>';
									email = entry.email || '<<no email>>';
								}
							}
						}

						return (
							<div
								key={idx}
								ref={activeEntry === record ? activeEntryRef : null}
								className={`
							error-list-entry
							${visitedEntries.current.has(record) && 'visited'}
							${activeEntry === record && 'active'}
						`}
								onClick={() => {
									selectEntry(record);
								}}
							>
								<div className="error-list-entry-info">
									<div className="error-list-entry-count">{record.count}</div>
									<div className="error-list-entry-msg">{msg}</div>
									{ip && <div className="error-list-entry-ip">{ip}</div>}
									{email && <div className="error-list-entry-email arr-sep">{email}</div>}
									{ts && <div className="error-list-entry-email arr-sep">{ts}</div>}
									{!uniqErr && groupBy === 'message' && (
										<div className="error-list-entry-uniq">
											(ip: {uniq.ip}, email: {uniq.email}, anon: {uniq.anon}, ua:{' '}
											{uniq.ua})
										</div>
									)}
								</div>

								{renderDetail(record.detail, withUrl || uniqErr, withStack || uniqErr)}
							</div>
						);
					})}
				</div>

				{activeEntry && (
					<div onClick={handleNextError} className="error-list-nav-ctrl next" title="Next Error">
						➡
					</div>
				)}
			</div>
		</>
	);
}

function renderDetail(detail: AggregationEntry['detail'], url: boolean, stack: boolean) {
	return Object.values(detail)
		.sort((a, b) => b.count - a.count)
		.map(({entry, count}, idx) => {
			const err = entry.msg.err;
			const row = err.parsedStack[0] || {
				file: err.source,
				line: err.line,
				column: err.col,
			};

			return (
				<div className="error-list-entry-sub" key={idx}>
					<div className="flex">
						<div className="error-list-entry-count">{count}</div>
						<div className="error-list-entry-cetegory">{entry.msg.category}</div>
						<div className="error-list-entry-fn arr-sep">{row.fn}</div>
						<div className="error-list-entry-file arr-sep">
							{row.file.split('?')[0]}:{row.line}:{row.column}
						</div>
					</div>
					{<div className="error-list-entry-ua">{entry.ua}</div>}
					{url && <div className="error-list-entry-url">{entry.msg.err.url}</div>}
					{stack && <div className="error-list-entry-stack">{entry.msg.err.stack}</div>}
				</div>
			);
		});
}
