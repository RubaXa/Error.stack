import React from 'react';

// import { parseLog } from './log/log';
// import { errorLog } from './error-log/error-log';
import {DragAndDropZone} from './dnd/dnd';
import {ErrorLog} from './error-log/error-log';
import {Inspector} from './inspector/inspector';
import {useAppState} from './state';

export function App() {
	const state = useAppState();
	const [rawLog, setRawLog] = React.useState(state.rawLog);
	const handlePaste = React.useCallback(
		(evt: React.ClipboardEvent<HTMLTextAreaElement>) => {
			setRawLog(evt.clipboardData.getData('text'));
		},
		[setRawLog],
	);

	React.useEffect(() => {
		window.addEventListener('message', ({data}) => {
			if (data && data.type === 'RAW_LOG' && data.raw) {
				console.log('Received raw log:', data.raw);
				setRawLog(data.raw.map((r: any) => JSON.stringify(r)).join('\n'));
			}
		});

		parent.postMessage('PULL', '*');
	}, []);

	return (
		<>
			<DragAndDropZone
				filter={/\.(txt|log)/}
				onDrop={(files) => {
					readFilesAsLog(files).then(setRawLog);
				}}
			/>

			{rawLog ? <Inspector rawLog={rawLog} /> : <ErrorLog onPaste={handlePaste} />}
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
				reject(new Error(`Failed read:$ {file.name}`));
			}
		});
	});
}
