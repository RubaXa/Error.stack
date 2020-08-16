import {createBundle} from '@mail-core/platform/rollup';
import {join} from 'path';

export default [
	createBundle({
		input: join(__dirname, 'index.tsx'),
		output: {
			name: 'errorStack',
			format: 'iife',
			file: join(__dirname, 'index.min.js'),
		},
		pluginsOptions: {
			typeScript: {
				tsconfig: join(__dirname, 'tsconfig.rollup.json'),
				declaration: false,
			},
			replace: {},
			sizes: null,
			sizeSnapshot: null,
			visualizer: null,
			terser: null,
		},
	}),
];
