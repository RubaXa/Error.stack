import type {LegacyLogError} from '@mail-core/logger/legacy/log';

export function canInspected(err: LegacyLogError) {
	return err.parsedStack.length > 0;
}
