import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import getQuote from './getQuote';
import { CustomQuote } from '../../types';

function buildCustomQuote(overrides: Partial<CustomQuote> = {}): CustomQuote {
	return {
		text: 'A stitch in time saves nine.',
		author: 'Proverb',
		...overrides,
	};
}

describe('getQuote', () => {
	it('returns a quote from the custom list', () => {
		const quote = getQuote([
			buildCustomQuote({ text: 'Be water.', author: 'Bruce Lee' }),
		]);

		expect(quote).toEqual({ content: 'Be water.', author: 'Bruce Lee' });
	});

	it('returns null when there are no custom quotes configured', () => {
		const quote = getQuote([]);

		expect(quote).toBeNull();
	});

	it('can return any entry in a multi-quote list', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.99);

		const quote = getQuote([
			buildCustomQuote({ text: 'First.', author: 'A' }),
			buildCustomQuote({ text: 'Second.', author: 'B' }),
		]);

		expect(quote).toEqual({ content: 'Second.', author: 'B' });
		vi.restoreAllMocks();
	});
});