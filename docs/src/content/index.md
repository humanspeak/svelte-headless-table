---
title: Get Started
description: Learn how to set up and start using our modern documentation template built with Svelte 5, MDSvex, and Tailwind CSS.
---

# Getting Started

Create beautiful, modern documentation for your project in minutes with our Svelte-powered documentation template.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Git installed
- A GitHub account
- Basic familiarity with Markdown

## Quick Start

1. Go to [GitHub](https://github.com/code-gio/svelte-docs-starter)  click the green **"Use this template"** button at the top of this page
2. Select **"Create a new repository"**
3. Name your repository and choose its visibility
4. Click **"Create repository from template"**
5. Clone your new repository:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   ```
6. Install dependencies:
   ```bash
   cd your-repo-name
   npm install
   ```
7. Start the development server:
   ```bash
   npm run dev
   ```

Your documentation site is now running at `http://localhost:5173`!

## Core Features

Our template combines powerful tools to create an exceptional documentation experience:

- **Component Library**: Built on shadcn/ui for beautiful, accessible components
- **Type Safety**: Full TypeScript support for reliable development
- **Modern Stack**: Powered by Svelte 5, MDSvex, and TailwindCSS
- **Customizable**: Easy theming and layout modifications

## Adding Content

### Creating Pages

1. Add new `.md` files in the `src/docs` directory
2. Include frontmatter at the top of your markdown files:
   ```markdown
   ---
   title: Your Page Title
   description: A brief description of the page
   ---
   ```
3. Write your content using Markdown and MDSvex features

### Using Components

Import and use Svelte components directly in your markdown:

```markdown
<script>
  import { Alert } from '$lib/components/ui/alert';
</script>

# My Page

<Alert>
  This is a custom component in markdown!
</Alert>
```

## Next Steps

- Browse the [Examples](/docs/examples) to see what you can build
- Learn about customization in our [Customization Guide](/docs/customize)
- Check out our [Component Styling](/docs/styling/theme)

## Need Help?

- Browse our [documentation](/docs)
- Report issues on [GitHub](https://github.com/code-gio/svelte-docs-starter/issues)
- Check out the [examples](/docs/examples) for inspiration