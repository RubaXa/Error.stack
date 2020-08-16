import React from 'react';

export type ErrorLogProps = {
	onPaste: React.ClipboardEventHandler<HTMLTextAreaElement>;
};

export function ErrorLog(props: ErrorLogProps) {
	return (
		<textarea
			id="error-log"
			className="well"
			onPaste={props.onPaste}
			placeholder={[
				'',
				'  Paste your',
				'   - stack trace',
				'   - legacy log',
				'   - DnD supported',
				'',
			].join('\n')}
		/>
	);
}
