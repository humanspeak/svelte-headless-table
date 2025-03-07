---
title: Syntax Highlighting
description: Learn how to customize code syntax highlighting using Shiki
---


The documentation template uses [Shiki](https://shiki.matsu.io/) for syntax highlighting. This guide explains how to customize themes and add support for additional programming languages.

## Adding Custom Themes

### Step 1: Import Themes
In your `doc-render.svelte` component, modify the `createHighlighter` configuration to include your preferred themes:

```typescript
highlighter = await createHighlighter({
    themes: [
        'github-dark',        // Default dark theme
        'github-light',       // Default light theme
        'dracula',           // Add more themes
        'nord',
        'material-theme'
    ],
    langs: [ ... ]
});
```

### Available Built-in Themes
Shiki includes many popular themes out of the box:
- `'github-dark'`
- `'github-light'`
- `'dracula'`
- `'nord'`
- `'monokai'`
- `'material-theme'`
- `'one-dark-pro'`
- And [many more](https://github.com/shikijs/shiki/blob/main/docs/themes.md)

## Adding Programming Languages

### Step 1: Update Language Support
Modify the `langs` array in the `createHighlighter` configuration:

```typescript
highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [
        // Currently supported languages
        'typescript',
        'javascript',
        'bash',
        'markdown',
        'json',
        'html',
        'css',
        'svelte',
        'shell',
        'tsx',
        // Add more languages
        'python',
        'rust',
        'go',
        'java',
        'php',
        'ruby',
        'yaml'
    ]
});
```

### Available Languages
Shiki supports a wide range of programming languages. Here are some popular ones:
- Web: `html`, `css`, `javascript`, `typescript`, `jsx`, `tsx`
- Backend: `python`, `ruby`, `php`, `java`, `rust`, `go`
- Data: `json`, `yaml`, `toml`
- Shell: `bash`, `shell`, `powershell`
- And [many more](https://github.com/shikijs/shiki/blob/main/docs/languages.md)

## Customizing Styles

### Code Block Wrapper
Modify the wrapper styles in the component's `<style>` section:

```css
:global(.shiki-wrapper) {
    margin: 1.5em 0;
    padding: 1.25rem;
    border-radius: 0.5rem;
    width: 100%;
    max-width: calc(100vw - 3rem);
    overflow-x: auto;
    display: block;
    background-color: #f6f8fa;
    border: 1px solid #d0d7de;
}

:global(.dark .shiki-wrapper) {
    background-color: #0d1117 !important;
    border-color: #30363d;
}
```

### Code Font and Size
Customize the code appearance:

```css
:global(.shiki) {
    background-color: transparent !important;
    font-family: 'JetBrains Mono', ui-monospace;
    font-size: 0.9em;
    line-height: 1.5;
}
```

### Inline Code
Style inline code blocks:

```css
:global(.prose :not(pre) > code) {
    background-color: rgb(175 184 193 / 20%);
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-weight: 400;
    max-width: 100%;
}

:global(.dark .prose :not(pre) > code) {
    background-color: rgb(30 41 59);
}
```

### Line Hover Effects
Customize line highlighting effects:

```css
:global(.line:hover) {
    background-color: rgb(175 184 193 / 10%);
}

:global(.dark .line:hover) {
    background-color: #1f2937;
}
```

## Best Practices

1. **Theme Consistency**: Choose themes that match your site's overall design
2. **Performance**: Only load the languages you need to minimize bundle size
3. **Accessibility**: Ensure sufficient contrast in code blocks
4. **Mobile Support**: Test code block appearance on different screen sizes

Remember to rebuild your site after making changes to see the updates take effect.