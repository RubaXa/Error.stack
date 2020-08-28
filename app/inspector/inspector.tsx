import type {AggregationEntry, LegacyLogEntry, LegacyLogEntryFailed} from '@mail-core/logger/legacy/log';
import React from 'react';

import {ErrorList} from './error-list';
import {Stack} from './stack';
import {Tabs} from './tabs';
import {canInspected} from './util';

export type InspectorProps = {
	entries: Array<LegacyLogEntry | LegacyLogEntryFailed>;
};

export function Inspector(props: InspectorProps) {
	const {entries} = props;
	const [activeEntry, setActiveEntry] = React.useState(null as AggregationEntry | null);
	const records = Object.values(activeEntry?.detail || {}).sort((a, b) => b.count - a.count);
	const [activeRecordEntry, setActiveRecordEntry] = React.useState(null as LegacyLogEntry | null);

	React.useEffect(() => {
		setActiveRecordEntry(records[0] ? records[0].entry : null);
	}, [activeEntry]);

	return (
		<div className="inspector">
			<ErrorList entries={entries} onSelect={setActiveEntry} />

			{activeEntry && (
				<div className="inspector-main">
					<div className="inspector-stack">
						<Stack key={activeRecordEntry?.msg.err.message} error={activeRecordEntry?.msg.err} />
					</div>

					<div className="inspector-detail">
						<Tabs
							data={[
								{
									title: 'Source',
									badge: records.length,
									children: getTabSource(records, activeRecordEntry, setActiveRecordEntry),
								},
								{
									title: 'UserAgent',
									badge: activeEntry.uniq.ua,
									children: getTabUserAgent(activeEntry),
								},
								{
									title: 'IP',
									badge: activeEntry.uniq.ip,
									children: getTabIP(activeEntry),
								},
								{
									title: 'Users',
									badge: `${activeEntry.uniq.email}/${activeEntry.uniq.anon}`,
									children: getTabEmail(activeEntry),
								},
							]}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function getTabSource(
	entries: Array<{entry: LegacyLogEntry; count: number}>,
	active: LegacyLogEntry | null,
	onClick: (etnry: LegacyLogEntry) => void,
) {
	return (
		<div className="tab-list">
			{entries.map((rec) => {
				const err = rec.entry.msg.err;
				const disabled = !canInspected(err);

				return listItem(
					<div className="flex">
						<div className="error-list-entry-fn">{err.parsedStack[0]?.fn || '<<unknown>>'}</div>
						<div className="arr-sep" />
						{err.source}:{err.line}
					</div>,
					rec.count,
					disabled
						? false
						: () => {
								onClick(rec.entry);
						  },
					active === rec.entry,
				);
			})}
		</div>
	);
}

function getTabUserAgent(entry: AggregationEntry) {
	return <div className="tab-list">{getTabList(entry, /^Mozilla\//i)}</div>;
}

function getTabIP(entry: AggregationEntry) {
	return <div className="tab-list">{getTabList(entry, /^\d+\.\d+\./i)}</div>;
}

function getTabEmail(entry: AggregationEntry) {
	return (
		<div className="tab-list">
			{getTabList(entry, /@.+\.[a-z]{2,}$/i)}
			{listItem('Anonymous', entry.uniq.anon)}
		</div>
	);
}

function getTabList(entry: AggregationEntry, filter: RegExp) {
	return Object.entries(entry.uniq.mem)
		.sort((a, b) => (b[1] || 0) - (a[1] || 0))
		.map(([key, count]) => (filter.test(key) ? listItem(key, count) : null));
}

function listItem(
	text: JSX.Element | string,
	count?: number,
	onClick?: false | (() => void),
	active?: boolean,
) {
	return (
		<div
			onClick={onClick === false ? undefined : onClick}
			aria-disabled={onClick === false}
			aria-selected={!!active}
			className={`tab-list-item ${onClick && 'clickable'}`}
		>
			<div className="tab-list-item-count">{count}</div>
			<div className="tab-list-item-text">{text}</div>
		</div>
	);
}
