// Package static provides embedded frontend assets
package static

import "embed"

// FS contains the embedded frontend build files
//
//go:embed build/*
var FS embed.FS
