import React from 'react';

export type DragAndDropZone = {
	filter: RegExp;
	onDrop: (files: File[]) => void;
};

export function DragAndDropZone(props: DragAndDropZone) {
	const overlayRef = React.useRef(null as HTMLDivElement | null);

	React.useEffect(() => {
		FileAPI.event.dnd(
			document,
			(state) => {
				if (overlayRef.current) {
					overlayRef.current.style.display = state ? '' : 'none';
				}
			},
			(_, files) => {
				const logs = files.filter((file) => props.filter.test(file.name));
				console.log('DnD.logs:', logs);
				props.onDrop(logs);
			},
		);
	}, []);

	return (
		<>
			<div ref={overlayRef} id="dndOverlay" style={{display: 'none'}} />
		</>
	);
}
