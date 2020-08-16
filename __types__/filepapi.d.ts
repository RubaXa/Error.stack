declare const FileAPI: FileAPI;

declare interface FileAPI {
	/**
	 * Get file list
	 *
	 * @param	{HTMLInputElement|Event}	input
	 * @param	{String|Function}	[filter]
	 * @param	{Function}			[callback]
	 * @return	{Array|Null}
	 */
	getFiles: (event: any) => File[];

	// todo: Image
	Image: (file: File) => any;

	/**
	 * Get info of file
	 */
	getInfo: (file: File, fn: (err: any, options: any) => void) => void;

	readAsText: (file: File, encoding: string, fn: (err: any, text: any) => void) => void;

	event: {
		dnd: (
			el: HTMLElement | Document,
			onHover: (state: boolean, eve: Event) => void,
			onDrop: (files: File[], allFiles: File[]) => void,
		) => void;
	};
}
