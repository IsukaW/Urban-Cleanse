// UC-V05: neutralize regex metacharacters in user-supplied input.
// Any value that comes from the client (search, filters) and is used inside a
// regex (e.g. Mongoose $regex / new RegExp) must pass through here first, so it
// is matched as literal text. Prevents regex injection and ReDoS payloads like
// "(.*)+$" or "^(a|a)*$" from being interpreted as patterns.
const escapeRegex = (value) => {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
	escapeRegex
};
