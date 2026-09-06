import { CustomQuote, Quote } from '../../types';

/**
 * Picks a random quote from the user's custom quotes list. Returns `null`
 * when the list is empty, which is an ordinary state (a fresh install, or
 * a user who hasn't added any quotes yet), not an error.
 *
 * Custom quotes are the only quote source by design - see
 * REFACTOR-DECISIONS.md before wiring up a network-based source.
 */
const getQuote = (customQuotes: CustomQuote[]): Quote | null => {
	if (customQuotes.length === 0) {return null;}

	const randomQuote =
		customQuotes[Math.floor(Math.random() * customQuotes.length)];

	return { content: randomQuote.text, author: randomQuote.author };
};

export default getQuote;