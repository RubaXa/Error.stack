import React from 'react';
import ReactDOM from 'react-dom';

import {App} from './app';
import {AppState, AppStateContext} from './app/state';

type Init = {
	state: AppState;
};

export function boot(el: HTMLElement, init: Init) {
	console.log(`Error.stack 🔦:`, init);

	const frag = (
		<AppStateContext.Provider value={init.state}>
			<App />
		</AppStateContext.Provider>
	);

	ReactDOM.render(frag, el);

	return true;
}
