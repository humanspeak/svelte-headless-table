---
title: Customization Guide
description: Learn how to customize your documentation site to match your brand and requirements
---


This guide will walk you through the various ways you can customize your documentation site to match your brand identity and specific needs. All customizations are type-safe, providing excellent IDE support and a reliable development experience.

## Site Configuration

The primary way to customize your site is through the `siteConfig.ts` file. The configuration follows the `SiteConfig` interface:

```typescript
interface SiteConfig {
    /** Current version of the documentation/project */
    version: string;
    
    /** Main title of the documentation site */
    title: string;
    
    /** Detailed description of the project/documentation */
    description: string;
    
    /** GitHub repository URL */
    github: string;
    
    /** NPM package name */
    npm: string;
    
    /** Array of quick navigation links */
    quickLinks: QuickLink[];
    
    /** Path to the main logo (light theme) */
    logo: string;
    
    /** Path to the dark theme logo (optional) */
    logoDark?: string;
    
    /** Path to the site favicon */
    favicon: string;
}
```

Example configuration:

```typescript
export const siteConfig: SiteConfig = {
    version: '0.0.1',
    title: 'Documentation',
    description: 'Comprehensive documentation for your project',
    github: 'https://github.com/yourusername/your-repo',
    npm: 'your-package-name',
    quickLinks: [
        { title: 'Customize', href: '/docs/customize' },
        { title: 'Examples', href: '/docs/examples' }
    ],
    logo: '/logo.svg',
    logoDark: '/logo-white.svg',
    favicon: '/favicon.png',
};
```

## Feature Highlights

Features are defined using the `Feature` interface, which requires an icon from Lucide, a title, and a description:

```typescript
interface Feature {
    icon: typeof IconType;
    title: string;
    description: string;
}
```

Example feature configuration:

```typescript
import { Boxes, Workflow, Paintbrush, Zap } from 'lucide-svelte';

export const features: Feature[] = [
    {
        icon: Boxes,
        title: 'Component Library',
        description: 'Built on top of shadcn/ui, offering comprehensive accessible components'
    },
    {
        icon: Workflow,
        title: 'Type Safe',
        description: 'Fully typed with TypeScript for excellent IDE support'
    },
    // Add more features as needed
];
```

## Promotional Section

The promotional section is configured using the `PromoConfig` interface:

```typescript
interface PromoConfig {
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
    lightImage?: string;
    darkImage?: string;
}
```

Example promotional configuration:

```typescript
export let promoConfig: PromoConfig = {
    title: 'Need help with your project?',
    description: 'Custom development services and technical guidance for your web applications',
    ctaText: "Let's work together",
    ctaLink: 'mailto:your@email.com',
    lightImage: '/images/promo-light.jpg',
    darkImage: '/images/promo-dark.jpg'
};
```

## Quick Links

Quick links are typed using the `QuickLink` interface imported from the nav types:

```typescript
import type { QuickLink } from "$lib/types/nav";

export const quickLinks: QuickLink[] = [
    { title: 'Customize', href: '/docs/customize' },
    { title: 'Examples', href: '/docs/examples' }
];
```

Each quick link requires a title and href property, providing easy navigation to key sections of your documentation.

Remember to rebuild your site after making configuration changes to see the updates take effect.