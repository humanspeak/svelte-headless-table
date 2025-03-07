---
title: Features
description: Explore the powerful features that make this documentation template stand out
---

# Features

Our documentation template comes with powerful built-in features designed to enhance both the developer and user experience.

## Automatic Documentation Navigation

The template automatically generates a navigation structure from your markdown files using an intelligent singleton pattern.

### How It Works
- Automatically scans your `/src/content` directory for markdown files
- Creates a nested navigation structure based on your folder hierarchy
- Supports customization through frontmatter metadata
- Handles special cases like index files and single-file folders
- Maintains a clean, organized sidebar structure

```typescript
// Example markdown frontmatter
---
title: Getting Started
description: Quick start guide
disabled: false
external: false
label: New
---
```

## Dynamic Table of Contents

Every documentation page automatically generates a table of contents from your markdown headings.

### Features
- Automatically extracts h1-h6 headings
- Generates unique IDs for each heading
- Updates in real-time as content changes
- Supports smooth scrolling to sections
- Provides both desktop and mobile views
- Maintains active section highlighting

The table of contents is implemented using a reactive system that:
- Watches for DOM changes
- Updates navigation states automatically
- Provides smooth scrolling behavior
- Supports dynamic content updates

## Document Search

Built-in search functionality powered by FlexSearch provides fast and accurate content discovery.

### Search Features
- Full-text search across all documentation
- Real-time search results
- Search through titles and content
- Fuzzy matching support
- Type-ahead suggestions
- Relevant result highlighting
- Mobile-friendly search interface

```typescript
// Example search usage
const results = await docsSearch.search("authentication");
```

## Dark Mode Support

The template includes a fully functional dark mode with system preference detection.

### Dark Mode Features
- System preference detection
- Manual toggle option
- Persistent preference storage
- Smooth theme transitions
- Consistent styling across components
- Dark mode optimized syntax highlighting

## Responsive Design

The documentation template is fully responsive and optimized for all device sizes.

### Responsive Features
- Mobile-first approach
- Adaptive navigation
- Responsive tables and code blocks
- Touch-friendly interactions
- Optimized reading experience
- Collapsible sidebar on mobile

## Promotional Components

Built-in promotional components help you highlight important information or calls-to-action.

### Promo Features
- Customizable promo cards
- Strategic placement options
- Responsive design
- Dark mode support
- Call-to-action buttons
- Custom imagery support

## Full Customization

The template is designed to be fully customizable to match your brand and requirements.

### Customization Options
- Theme customization
- Typography settings
- Layout modifications
- Component styling
- Navigation structure
- Search behavior
- Promotional content
- Syntax highlighting

## Quick Reference

```typescript
// Initialize documentation features
await docsNavigation.generateNavigation();
await docsSearch.initializeSearchIndex();
const toc = TableOfContents.getInstance(contentRef);
```

All features are implemented using singleton patterns for efficient state management and consistent behavior across your documentation site.