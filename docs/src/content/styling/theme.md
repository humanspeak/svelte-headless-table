---
title: Theme
description: Learn how to customize the look and feel of your documentation site
---


This guide explains how to customize the visual appearance of your documentation site.

## Theme Customization

### Option 1: Use Pre-built Themes

The easiest way to change your site's appearance is to use pre-built themes from [shadcn-svelte themes](https://next.shadcn-svelte.com/themes). These themes provide carefully crafted color schemes that work well together.

1. Visit the [shadcn-svelte themes](https://next.shadcn-svelte.com/themes)
2. Choose your preferred theme
3. Copy the theme values
4. Replace the `:root` and `.dark` values in your `app.css`

### Option 2: Manual Customization

You can customize the theme by modifying the CSS variables in `app.css`. The template uses a comprehensive set of design tokens:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 72.22% 50.59%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }
}
```

### Sidebar Customization

The sidebar has its own set of variables for fine-grained control:

```css
@layer base {
  :root {
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}
```

### Dark Mode Support

Dark mode colors can be customized by modifying the `.dark` class variables:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other dark mode variables ... */
}
```

## Typography Customization

The template includes custom prose styles for markdown content. You can modify these in `app.css`:

```css
@layer utilities {
  .prose {
    --tw-prose-pre-bg: transparent;
  }

  .prose pre {
    background-color: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .prose :not(pre)>code {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
    padding: 0.25rem 0.375rem;
    border-radius: 0.25rem;
    font-weight: 400;
    font-size: 0.875em;
  }
}
```

## Scroll Behavior

The template includes smooth scrolling and offset adjustments for better navigation:

```css
html {
  scroll-padding-top: 6rem;
  scroll-behavior: smooth;
}
```

## Best Practices

1. **Color Consistency**: Keep your color scheme consistent by using the CSS variables throughout your customizations
2. **Dark Mode Testing**: Always test your customizations in both light and dark modes
3. **Accessibility**: Ensure sufficient color contrast for text and interactive elements
4. **Mobile Testing**: Verify your customizations work well on different screen sizes

Remember to rebuild your site after making changes to see the updates take effect.