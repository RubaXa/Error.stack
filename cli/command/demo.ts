import {createCommand} from '@mail-core/cli';

export const demo = createCommand({
	name: 'test',
	describe: 'Test command for example',

	options: {
		checked: {
			type: 'boolean',
			description: `It's yargs option`,
		},
	},

	handler(argv, {describe, console}) {
		console.log(describe, argv);
	},
});
