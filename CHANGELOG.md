# Changelog

All notable changes to Tuvix Tricorder will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-02

### Added
- Initial release of Tuvix Tricorder extension
- Automatic RSS/Atom feed discovery on any webpage
- Visual status indicators (disabled, searching, discovered)
- One-click subscribe button to Tuvix RSS instances
- Configurable Tuvix base URL (defaults to https://feed.tuvix.app)
- Smart caching system (90-day TTL) to reduce redundant scans
- Cross-browser support (Chrome, Firefox, Edge, Safari)
- Keyboard shortcuts (Enter to discover, R to refresh)
- Custom scrollbar styling for feed list
- Settings button for future configuration options
- Support for RSS, Atom, RDF, and JSON feeds
- Handles special cases like Apple Podcasts
- Checks common feed locations (/feed, /rss, /atom.xml)
- Visual feedback on subscribe button click

### Technical Details
- Built with TypeScript and Manifest V3
- Uses webextension-polyfill for cross-browser compatibility
- Powered by @tuvixrss/tricorder library for feed discovery
- Tailwind CSS v4 with shadcn-inspired design system
- Sharp for SVG to PNG icon conversion
- esbuild for fast bundling
- 90-day local cache for discovered feeds

### Browser Support
- Chrome/Edge: 109+
- Firefox: 109+
- Safari: Compatible (requires Xcode conversion)

[1.0.0]: https://github.com/TechSquidTV/Tuvix-Tricorder-Extension/releases/tag/v1.0.0
