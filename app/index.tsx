import type {LegacyLogEntry, LegacyLogEntryFailed} from '@mail-core/logger/legacy/log';
import React from 'react';

// import { parseLog } from './log/log';
// import { errorLog } from './error-log/error-log';
import {DragAndDropZone} from './dnd/dnd';
import {ErrorLog} from './error-log/error-log';
import {Inspector} from './inspector/inspector';
import {parseLog} from './log/log';
import {useAppState} from './state';

export function App() {
	const state = useAppState();
	const [logEntries, setLogEntries] = React.useState([] as (LegacyLogEntry | LegacyLogEntryFailed)[]);
	const handlePaste = React.useCallback(
		(evt: React.ClipboardEvent<HTMLTextAreaElement>) => {
			const raw = evt.clipboardData.getData('text');
			setLogEntries(parseLog(raw));
		},
		[setLogEntries],
	);

	// Download remote log
	React.useEffect(() => {
		if (state.rawLog) {
			setLogEntries(parseLog(state.rawLog));
		}

		window.addEventListener('message', ({data}) => {
			if (data && data.type === 'RAW_LOG' && data.raw) {
				console.log('Received raw log:', data.raw);
				setLogEntries(data.raw);
			}
		});

		parent.postMessage('PULL', '*');
	}, []);

	return (
		<>
			<DragAndDropZone
				filter={/\.(txt|log)/}
				onDrop={(files) => {
					readFilesAsLog(files).then((raw) => {
						setLogEntries(parseLog(raw));
					});
				}}
			/>

			{logEntries.length ? <Inspector entries={logEntries} /> : <ErrorLog onPaste={handlePaste} />}
		</>
	);
}

function readFilesAsLog(files: File[]) {
	return Promise.all(files.map(readFileAsText)).then((logs) => logs.join('\n').trim());
}

function readFileAsText(file: File) {
	return new Promise((resolve, reject) => {
		console.time(file.name);

		FileAPI.readAsText(file, 'utf-8', (evt) => {
			if (evt.type === 'load') {
				console.timeEnd(file.name);
				resolve(evt.result);
			} else if (evt.type === 'error') {
				console.timeEnd(file.name);
				reject(new Error(`Failed read: ${file.name}`));
			}
		});
	});
}
