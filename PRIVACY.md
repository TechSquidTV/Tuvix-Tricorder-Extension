# Privacy Policy for Tuvix Tricorder

**Last Updated:** December 2, 2024

## Overview

Tuvix Tricorder is a browser extension that helps you discover RSS and Atom feeds on websites you visit. We are committed to protecting your privacy and being transparent about our data practices.

## Data Collection and Storage

### What We Collect

**Local Cache Only:**
- Discovered feed URLs and metadata (title, type) from websites you visit
- Your configured Tuvix instance base URL (if customized)

**We Do NOT Collect:**
- Your browsing history
- Personal information
- Analytics or telemetry data
- Cookies or tracking data

### Where Data is Stored

All data is stored **locally on your device** using the browser's storage API:
- Feed discovery results are cached for 90 days to improve performance
- Configuration settings are stored indefinitely until you change them
- No data is ever transmitted to external servers, except:
  - When you click "Subscribe" to open your Tuvix instance (navigates to your configured Tuvix URL)

### Data Transmission

The extension makes HTTP requests only when:
1. You click "Discover Feeds" - The extension analyzes the current page's HTML to find feed links
2. You click "Subscribe" - Opens a new tab to your Tuvix instance with the feed URL

**No data is sent to Tuvix Tricorder developers or third parties.**

## Permissions Justification

The extension requires these permissions:

- **`activeTab`**: To read the current page's content and discover feeds
- **`scripting`**: To inject feed discovery logic into web pages
- **`storage`**: To cache discovered feeds locally and save your settings
- **`host_permissions` (all sites)**: To discover feeds on any website you visit

## Data Deletion

You can delete all extension data at any time:

**Chrome/Edge:**
1. Right-click the extension icon
2. Select "Remove from Chrome/Edge"

**Firefox:**
1. Go to `about:addons`
2. Find Tuvix Tricorder
3. Click "Remove"

Alternatively, clear browser extension data:
- Chrome: `chrome://settings/clearBrowserData` → Advanced → "Hosted app data"
- Firefox: `about:preferences#privacy` → Clear Data → "Site settings"

## Third-Party Services

This extension integrates with:
- **Your Tuvix RSS instance** (self-hosted or official): When you click "Subscribe", the extension opens your configured Tuvix instance. Please refer to your Tuvix instance's privacy policy for how that service handles data.

## Open Source

Tuvix Tricorder is open source. You can review the complete source code at:
https://github.com/TechSquidTV/Tuvix-Tricorder-Extension

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last Updated" date.

## Contact

For questions about this privacy policy or data practices:
- GitHub: https://github.com/TechSquidTV/Tuvix-Tricorder-Extension/issues
- Main Project: https://github.com/TechSquidTV/Tuvix-RSS

## Children's Privacy

This extension is not directed at children under 13 and does not knowingly collect information from children.

## Your Consent

By using Tuvix Tricorder, you consent to this privacy policy.
