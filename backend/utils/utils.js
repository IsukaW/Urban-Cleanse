// UC-V05: neutralize regex metacharacters in user-supplied input.
// Any value that comes from the client (search, filters) and is used inside a
// regex (e.g. Mongoose $regex / new RegExp) must pass through here first, so it
// is matched as literal text. Prevents regex injection and ReDoS payloads like
// "(.*)+$" or "^(a|a)*$" from being interpreted as patterns.
const escapeRegex = (value) => {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// UC-V05: hard limits for client-supplied search input.
const MAX_SEARCH_LENGTH = 100;
const SEARCH_QUERY_TIMEOUT_MS = 5000;

// UC-V05: allowed characters - letters/digits/marks in any script, spaces and
// normal punctuation/symbols found in a name, email or area. Control, null-byte
// and zero-width characters are rejected (filter-smuggling / display-spoofing).
const ALLOWED_SEARCH_CHARS = /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}]*$/u;

// UC-V05: shared sanitiser for client values used in a regex ($regex / new
// RegExp). Enforces max length and allowed characters, then escapes
// metacharacters so input is data, never query syntax. Rejects bad input
// with statusCode 400.
const sanitizeSearchTerm = (value) => {
	const raw = String(value ?? '');

	if (raw.length > MAX_SEARCH_LENGTH) {
		const err = new Error(`Search input exceeds ${MAX_SEARCH_LENGTH} characters`);
		err.statusCode = 400;
		throw err;
	}

	if (!ALLOWED_SEARCH_CHARS.test(raw)) {
		const err = new Error('Search input contains unsupported characters');
		err.statusCode = 400;
		throw err;
	}

	return escapeRegex(raw);
};

module.exports = {
	escapeRegex,
	sanitizeSearchTerm,
	MAX_SEARCH_LENGTH,
	SEARCH_QUERY_TIMEOUT_MS
};
