# Documentation Template

A modern documentation template built with Svelte 5, MDSvex, and Tailwind CSS.

[Template Preview](https://svelte-docs.codegio.com/)

## Overview

Create beautiful, modern documentation sites with minimal setup. This template combines the power of Svelte 5 with the flexibility of Markdown to deliver a superior documentation experience.

## Features

- **📚 MDSvex Integration** - Write documentation in Markdown with Svelte components
- **🎨 Modern Design** - Built with Tailwind CSS and shadcn/ui components
- **🌙 Dark Mode** - Automatic dark mode with system preference detection
- **🔍 Search** - Built-in search functionality powered by FlexSearch
- **📱 Responsive** - Mobile-first design that works on all devices
- **📑 Auto-Navigation** - Automatic documentation structure generation
- **📖 Table of Contents** - Dynamic table of contents for each page
- **⚡ Fast** - Optimized for speed and performance
- **🔒 Type Safe** - Full TypeScript support

## Quick Start

1. Click the green "Use this template" button
2. Create a new repository
3. Clone your repository:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   ```
4. Install dependencies:
   ```bash
   cd your-repo-name
   npm install
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
your-project/
├── src/
│   ├── content/          # Documentation markdown files
│   ├── lib/
│   │   ├── components/   # Core components
│   │   │   ├── document/ # Document-related components
│   │   │   ├── home/     # Home page components
│   │   │   └── ui/       # UI components
│   │   ├── hooks/        # Custom hooks
│   │   ├── types/        # TypeScript type definitions
│   │   ├── config.ts     # Site configuration
│   │   ├── index.ts      # Library exports
│   │   └── utils.ts      # Utility functions
│   ├── routes/           # SvelteKit routes
│   ├── app.css          # Global styles
│   ├── app.d.ts         # TypeScript declarations
│   └── app.html         # HTML template
└── static/              # Static assets
```

## Writing Documentation

Place your markdown files in the `src/content` directory. The folder structure will automatically generate the navigation.

```markdown
---
title: Getting Started
description: Learn how to use this template
---

# Getting Started

Write your documentation here...
```

## Customization

### Themes
Modify the theme in `src/app.css` or use pre-built themes from [shadcn-svelte](https://next.shadcn-svelte.com/themes).

### Components
Customize components in `src/lib/components` to match your brand.

### Configuration
Update site settings in `src/lib/config`:
```typescript
export const siteConfig = {
    title: 'Your Documentation',
    description: 'Your site description',
    // ...other settings
};
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This template can be deployed to any static hosting platform:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - use this template for any project.

## Acknowledgments

- [Svelte](https://svelte.dev)
- [shadcn-svelte](https://next.shadcn-svelte.com)
- [Tailwind CSS](https://tailwindcss.com)
- [MDSvex](https://mdsvex.com)

## Support

Need help with your documentation? [Contact us](mailto:info@codegio.com).