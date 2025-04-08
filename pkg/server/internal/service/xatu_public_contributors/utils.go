package xatu_public_contributors

import (
	"regexp"
	"strings"
)

// Define regex patterns used in Python logic
var (
	// Corresponds to extractAll(meta_client_name, '/([^/]+)/[^/]+$')[1]
	// Matches the second-to-last component separated by '/'
	usernameRegex = regexp.MustCompile(`/([^/]+)/[^/]+$`)
)

// ExtractUsername replicates the logic from the Python user_summaries processor
// to extract a username from the meta_client_name.
func ExtractUsername(metaClientName string) string {
	// Handle specific cases first as in Python's CASE statement
	if strings.HasPrefix(metaClientName, "pub") {
		matches := usernameRegex.FindStringSubmatch(metaClientName)
		if len(matches) > 1 {
			return matches[1]
		}
	} else if strings.HasPrefix(metaClientName, "ethpandaops") {
		// Python user_summaries returns 'ethpandaops'
		return "ethpandaops"
	} else {
		// Default case from Python user_summaries processor (using the same regex)
		matches := usernameRegex.FindStringSubmatch(metaClientName)
		if len(matches) > 1 {
			return matches[1]
		}
	}

	// Fallback: return empty string if no pattern matches or name is empty/invalid
	return ""
}

// ExtractUsernameForUsers specifically implements the logic derived from the Python Users processor query.
// It uses the common regex but explicitly excludes 'ethpandaops'.
func ExtractUsernameForUsers(metaClientName string) string {
	// Exclude ethpandaops explicitly as done in the Users query WHERE clause
	if strings.HasPrefix(metaClientName, "ethpandaops") || metaClientName == "" {
		return ""
	}
	matches := usernameRegex.FindStringSubmatch(metaClientName)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}
