import React from 'react';

export type AppState = {
	rawLog: string;
};

const defaultState: AppState = {
	rawLog: '',
};

export const AppStateContext = React.createContext(defaultState);

export function useAppState() {
	return React.useContext(AppStateContext);
}
