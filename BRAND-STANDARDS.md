# FastPass: Digital Brand Standards Guide

**Version**: 2.1
**Last Updated**: 2025-11-04
**Status**: ✅ Official Brand Standards - Production Implementation

This guide defines the complete visual identity for the FastPass application based on the production landing page implementation. All future views and components MUST adhere to these standards for consistency.

---

## 1. Brand Essence & Tone

| Element | Description |
|---------|-------------|
| **Identity** | Premium, Exclusive, Efficient, Technical, and Modern. |
| **Core Value** | Monetizing expertise and prioritizing time through guaranteed responses. |
| **Visual Goal** | High-tech efficiency with controlled access - a "VIP" digital experience with atmospheric depth. |
| **Design Language** | Dark Mode First, Neon Accents, Glassmorphism, Floating Orbs, Technical Clarity. |

---

## 2. Logo & Brand Mark

### Primary Logo

**File**: `/public/logo-final-optimized.png` (optimized PNG with transparency)

**Structure**:
- Stylized ticket/pass design with perforated edges
- Green neon border (#5cffb0)
- "FastPass" wordmark in **pure white (#FFFFFF)** + ".email" domain
- **True transparent background** (checkered pattern removed via ImageMagick)
- Clean integration with dark gradient backgrounds

**Technical Details**:
- Format: PNG with alpha channel
- Text Color: Pure white (#FFFFFF) for maximum contrast on dark backgrounds
- Background: Fully transparent (no artifacts or checkered patterns)
- Border: Neon green (#5cffb0) with ticket perforations

### Logo Sizes (Updated November 2025)

| Size | Width | Use Case | Component Usage |
|------|-------|----------|-----------------|
| **sm** | 250px | Navigation, compact areas | `<FastPassLogo size="sm" />` |
| **md** | 350px | Standard usage, sidebars (25% larger) | `<FastPassLogo size="md" />` |
| **lg** | 450px | Hero sections | `<FastPassLogo size="lg" />` |
| **xl** | 550px | Landing page header | `<FastPassLogo size="xl" />` |

### Logo Effects

**Glow Effect**:
```css
/* Default state */
drop-shadow: 0 0 15px rgba(92, 255, 176, 0.3);

/* Hover state */
drop-shadow: 0 0 25px rgba(92, 255, 176, 0.5);
```

**Transition**: `300ms ease-out`

**Tagline Placement**:
- Text: "GUARANTEED RESPONSES"
- Position: -12px (mobile) / -16px (desktop) negative margin
- Spacing: `tracking-wider`
- Color: `rgba(255, 255, 255, 0.8)`

### Iconography

Icons should be minimalist and linear:
- **Style**: Neon line icons or solid fills
- **Primary color**: Neon Vert (#5cffb0)
- **Feature card icons**: Multi-color gradients contained in rounded shapes
- **Size**: Consistent sizing (40px mobile, 48px desktop typical)

---

## 3. Color Palette

### Primary Colors (Production Values)

| Name | Hex Code | RGB | Purpose | Tailwind Reference |
|------|----------|-----|---------|-------------------|
| **Neon Vert** (Primary Accent) | `#5cffb0` | `rgb(92, 255, 176)` | Titles, borders, interactive states, logo, primary brand color | `text-[#5cffb0]` |
| **Light Gray** (Body Text) | `#B0B0B0` | `rgb(176, 176, 176)` | Body text, descriptions, secondary information | `text-[#B0B0B0]` |
| **Dark Navy** (Card Background) | `#1a1f2e` | `rgb(26, 31, 46)` | CTA cards, FAQ cards, content containers | `bg-[#1a1f2e]` |
| **Near Black** (Button Text) | `#0a0e1a` | `rgb(10, 14, 26)` | Button text on light gradient backgrounds | `text-[#0a0e1a]` |

### Background Gradient Colors

**Base Gradient** (135deg diagonal):
```css
linear-gradient(135deg,
  #0d2626 0%,    /* Dark Teal - top left */
  #1a1f3a 40%,   /* Dark Navy */
  #1e2640 70%,   /* Navy Purple */
  #1a1a2e 100%   /* Dark Purple - bottom right */
)
```

**Orb Colors** (Floating background elements):
```css
/* Dark orbs (depth) */
rgba(20, 30, 40, 0.8)   /* Darkest gray */
rgba(15, 35, 35, 0.9)   /* Dark teal */
rgba(25, 40, 50, 0.7)   /* Medium dark */
rgba(30, 50, 60, 0.6)   /* Lighter dark */

/* Accent orb (brand hint) */
rgba(92, 255, 176, 0.1)  /* Subtle green - barely visible */
```

### Secondary Colors (Hover States)

| Name | Hex Code | Purpose |
|------|----------|---------|
| **Neon Vert Hover** | `#4de89d` | Lighter variant for hover states |
| **Dark Teal Hover** | `#253740` | Button gradient end hover state |

### Opacity Levels (Standardized)

| Opacity | RGBA Alpha | Use Case |
|---------|------------|----------|
| Full | `1.0` or `/100` | Primary text, headings |
| High | `0.95` or `/95` | Card backgrounds (dark) |
| Medium-High | `0.90` or `/90` | FAQ cards |
| Medium | `0.80` or `/80` | Small text, footer |
| Low | `0.30` or `/30` | Borders, subtle accents |
| Very Low | `0.20` or `/20` | Subtle borders, glows |
| Minimal | `0.15` or `/15` | Faint accents |

---

## 4. Typography

**Font Family**: System Sans-Serif Stack (Tailwind Default)
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Type Scale & Usage (Production Implementation)

| Element | Color | Weight | Mobile Size | Desktop Size | Usage | Implementation |
|---------|-------|--------|-------------|--------------|-------|----------------|
| **H1: Hero Headline** | Neon Vert | Bold | `text-4xl` | `text-7xl` | Main hero (e.g., "GET PAID TO ANSWER FAST") | `text-[#5cffb0] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold` |
| **H2: Section Titles** | Neon Vert | Semibold | `text-2xl` | `text-4xl` | Major sections (e.g., "FAQ", "Keep your inbox clean") | `text-[#5cffb0] text-2xl sm:text-3xl font-semibold` |
| **H3: Card/Feature Titles** | Neon Vert | Semibold | `text-lg` | `text-xl` | Card headers (e.g., "Set Your Price") | `text-[#5cffb0] text-lg sm:text-xl font-semibold` |
| **Body Text (Primary)** | Light Gray | Regular | `text-sm` | `text-base/lg` | Paragraphs, descriptions | `text-[#B0B0B0] text-sm sm:text-base font-normal` |
| **Body Text (Large)** | Light Gray | Regular | `text-base` | `text-lg/xl` | Important paragraphs, hero subtext | `text-[#B0B0B0] text-base sm:text-lg font-normal` |
| **Small Text** | Light Gray 80% | Regular | `text-xs` | `text-xs` | Fine print, disclaimers | `text-[#B0B0B0]/80 text-xs font-normal` |
| **Tagline** | White 80% | Medium | `text-xs` | `text-sm` | Logo tagline ("GUARANTEED RESPONSES") | `text-white/80 text-xs sm:text-sm font-medium tracking-wider` |

### Typography Guidelines

- **Line Height**: Use `leading-tight` for headlines, `leading-relaxed` for body text
- **Letter Spacing**: `tracking-wider` for uppercase taglines only
- **Text Alignment**: Center for hero/sections, left for cards/body content
- **Responsive Scaling**: Always use responsive size classes (`sm:`, `md:`, `lg:`)

---

## 5. UI Components & Patterns

### 5.1 Background System

**Component**: `<StaticBackground />`
**Location**: `src/components/ui/StaticBackground.tsx`
**Implementation**: Global, rendered once in `App.tsx`

**Structure**:
```css
/* Layer 1: Base gradient */
position: fixed;
z-index: -10;
background: linear-gradient(135deg, #0d2626 0%, #1a1f3a 40%, #1e2640 70%, #1a1a2e 100%);

/* Layer 2: Floating orbs (5 total) */
- Top Right: 600px orb, dark gray, opacity 40%, blur 100px
- Bottom Left: 700px orb, dark teal, opacity 40%, blur 100px
- Right Side: 500px orb, medium dark, opacity 30%, blur 80px
- Top Left: 400px orb, subtle green, opacity 15%, blur 60px
- Center: 350px orb, balance, opacity 20%, blur 70px
```

**Animation**: Custom `float` keyframes
```css
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
}
```
- **Duration**: 20s - 35s per orb (varied)
- **Timing**: `ease-in-out infinite`
- **Delays**: Staggered (3s, 5s, 7s, 10s)

### 5.2 Feature Cards (Transparent Glass Cards)

**Visual Style**: Glassmorphism with neon border

```tsx
className="bg-transparent backdrop-blur-sm
           border border-[#5cffb0]
           shadow-[0_0_15px_rgba(92,255,176,0.3)]
           rounded-xl"
```

**Properties**:
| Property | Value | Purpose |
|----------|-------|---------|
| Background | `bg-transparent` | See-through to background |
| Backdrop Blur | `backdrop-blur-sm` | Subtle blur effect |
| Border | `1px solid #5cffb0` | Neon green outline |
| Glow | `0 0 15px rgba(92,255,176,0.3)` | Subtle outer glow |
| Radius | `rounded-xl` (12px) | Soft corners |
| Padding | `p-4 sm:p-6` | Content spacing |

**Content Structure**:
1. Icon container (gradient circle, 40px/48px)
2. H3 title (Neon Vert, Semibold)
3. Body text (Light Gray, Regular)

**Grid Layout**:
```tsx
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
gap-6 sm:gap-8
```

### 5.3 CTA Cards (Dark Solid Cards)

**Visual Style**: Dark semi-transparent with subtle glow

```tsx
className="bg-[#1a1f2e]/95 backdrop-blur-md
           border border-[#5cffb0]/30
           shadow-[0_0_20px_rgba(92,255,176,0.2)]
           rounded-xl"
```

**Properties**:
| Property | Value | Purpose |
|----------|-------|---------|
| Background | `#1a1f2e` at 95% opacity | Dark navy, slightly transparent |
| Backdrop Blur | `backdrop-blur-md` | Medium blur effect |
| Border | `1px solid rgba(92,255,176,0.3)` | Subtle neon border |
| Glow | `0 0 20px rgba(92,255,176,0.2)` | Soft outer glow |
| Radius | `rounded-xl` (12px) | Soft corners |
| Padding | `p-6 sm:p-8` | Generous spacing |

**Use Cases**:
- Primary CTA section
- Important action containers
- High-priority content boxes

### 5.4 FAQ Cards (Dark Info Cards)

```tsx
className="bg-[#1a1f2e]/90 backdrop-blur-md
           border border-[#5cffb0]/20
           shadow-[0_0_15px_rgba(92,255,176,0.15)]
           rounded-xl"
```

**Differences from CTA Cards**:
- Slightly more transparent (90% vs 95%)
- Lighter border (20% vs 30%)
- Softer glow (15% vs 20%)
- Less visual emphasis (secondary content)

**Content Structure**:
1. Question (H3, Neon Vert, with ❓ emoji)
2. Answer container (flex with 💡 emoji)
3. Body text (Light Gray, Regular)

### 5.5 Buttons

#### Primary Button (Gradient CTA)

```tsx
className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C]
           hover:from-[#4de89d] hover:to-[#253740]
           text-[#0a0e1a] hover:text-white
           font-bold py-4 px-8 text-lg rounded-xl
           transition-colors duration-300"
```

**Properties**:
- Gradient: Neon Vert → Dark Teal
- Hover: Lighter variants
- Text: Dark on default, White on hover
- Size: Large padding (py-4 px-8)
- Radius: Extra large (rounded-xl)
- Transition: 300ms color change

#### Secondary Button (Outline)

```tsx
className="border-[#5cffb0] text-[#5cffb0]
           hover:bg-[#5cffb0]/10 hover:text-[#5cffb0]"
```

**Properties**:
- Border: Neon Vert
- Text: Neon Vert
- Hover: Subtle green background
- Background: Transparent by default

---

## 6. Spacing & Layout System

### Container Max Widths

| Container | Max Width | Use Case |
|-----------|-----------|----------|
| Hero Text | `max-w-2xl` (672px) | Main headline area |
| Feature Cards Grid | `max-w-4xl` (896px) | 3-column card grid |
| Brand Messaging | `max-w-3xl` (768px) | Text-heavy sections |
| CTA Card | `max-w-md` (448px) | Focused action box |
| FAQ Section | `max-w-4xl` (896px) | Q&A cards |

### Spacing Scale (Vertical Rhythm)

| Spacing | Class | Use Case |
|---------|-------|----------|
| **Micro** | `gap-1` (4px) | Logo to tagline (tight lockup) |
| **Small** | `mb-2`, `gap-3` | Card internal spacing |
| **Medium** | `mb-4`, `mb-6` | Section elements |
| **Large** | `mb-8`, `mb-12` | Between major sections (mobile/desktop) |
| **XLarge** | `mb-12`, `mb-16` | Major page sections |

### Negative Margins (Special Cases)

```tsx
-mt-3 sm:-mt-4  // Logo tagline pull-up
```

### Grid Gaps

```tsx
gap-6 sm:gap-8  // Feature cards (24px → 32px)
space-y-6       // FAQ cards vertical stack (24px)
space-y-8       // Brand messaging sections (32px)
```

---

## 7. Effects & Animations

### 7.1 Glow Effects (Shadow System)

**Card Glows**:
```css
/* Feature cards */
box-shadow: 0 0 15px rgba(92, 255, 176, 0.3);

/* CTA cards */
box-shadow: 0 0 20px rgba(92, 255, 176, 0.2);

/* FAQ cards */
box-shadow: 0 0 15px rgba(92, 255, 176, 0.15);
```

**Logo Glow**:
```css
/* Default */
filter: drop-shadow(0 0 15px rgba(92, 255, 176, 0.3));

/* Hover */
filter: drop-shadow(0 0 25px rgba(92, 255, 176, 0.5));
```

### 7.2 Transitions

**Standard Transition**:
```css
transition: all 300ms ease-out;
```

**Color Transition** (Buttons):
```css
transition-colors duration-300;
```

**Logo Scale** (Hover):
```css
hover:scale-105
```

### 7.3 Backdrop Effects

```css
backdrop-blur-sm   /* Subtle blur (feature cards) */
backdrop-blur-md   /* Medium blur (CTA/FAQ cards) */
```

**Purpose**: Creates glassmorphism effect where background shows through

### 7.4 Hover States

**Cards**: Slight brightness increase or border glow enhancement
**Buttons**: Gradient shift + text color change
**Logo**: Enhanced glow + subtle scale
**Links**: Neon Vert color with underline

---

## 8. Responsive Breakpoints

### Tailwind Breakpoints (Default)

| Prefix | Min Width | Typical Use |
|--------|-----------|-------------|
| `sm:` | 640px | Small tablets, large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, desktops |
| `xl:` | 1280px | Large desktops |

### Responsive Patterns

**Typography Scale**:
```tsx
text-4xl sm:text-5xl md:text-6xl lg:text-7xl
```

**Spacing Scale**:
```tsx
mb-8 sm:mb-12     // 32px → 48px
gap-6 sm:gap-8    // 24px → 32px
```

**Grid Columns**:
```tsx
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

**Padding**:
```tsx
p-4 sm:p-6   // Card padding
p-6 sm:p-8   // CTA padding
```

---

## 9. Component Implementation Guidelines

### 9.1 Page Structure Template

```tsx
<div className="min-h-screen relative overflow-hidden">
  {/* StaticBackground rendered globally in App.tsx */}

  <div className="relative z-10 min-h-screen flex flex-col">
    {/* Header */}
    <header className="p-4 sm:p-6 text-center">
      <FastPassLogo size="xl" />
      <p className="text-white/80 ...">TAGLINE</p>
    </header>

    {/* Main Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
      {/* Content sections */}
    </div>

    {/* Footer */}
    <footer className="text-center py-6 text-white/60 text-sm">
      <p>© 2025 FastPass • Guaranteed Response Platform</p>
    </footer>
  </div>
</div>
```

### 9.2 Reusable Component Patterns

**Transparent Card**:
```tsx
<Card className="bg-transparent backdrop-blur-sm border border-[#5cffb0]
                 shadow-[0_0_15px_rgba(92,255,176,0.3)]">
  <CardContent className="p-4 sm:p-6">
    {/* Content */}
  </CardContent>
</Card>
```

**Dark Content Card**:
```tsx
<Card className="bg-[#1a1f2e]/90 backdrop-blur-md border border-[#5cffb0]/20
                 shadow-[0_0_15px_rgba(92,255,176,0.15)]">
  <CardContent className="p-6 sm:p-8">
    {/* Content */}
  </CardContent>
</Card>
```

**Section Container**:
```tsx
<div className="w-full max-w-4xl mx-4 mb-12 sm:mb-16">
  {/* Section content */}
</div>
```

### 9.3 Text Pattern Examples

**Hero Headline**:
```tsx
<h1 className="text-[#5cffb0] text-4xl sm:text-5xl md:text-6xl lg:text-7xl
               font-bold mb-6 leading-tight">
  YOUR HEADLINE
</h1>
```

**Section Title**:
```tsx
<h2 className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold
               text-center mb-6">
  Section Title
</h2>
```

**Body Paragraph**:
```tsx
<p className="text-[#B0B0B0] text-base sm:text-lg font-normal
              leading-relaxed text-center px-4">
  Your paragraph text here.
</p>
```

---

## 10. Accessibility Standards

### Color Contrast Requirements

| Combination | Contrast Ratio | WCAG Level |
|-------------|----------------|------------|
| Neon Vert (#5cffb0) on Dark Background | ~12:1 | AAA ✅ |
| Light Gray (#B0B0B0) on Dark Background | ~7:1 | AA+ ✅ |
| White/80 on Dark Background | ~10:1 | AAA ✅ |

### Focus States

**All Interactive Elements**:
```css
focus:outline-none
focus:ring-2
focus:ring-[#5cffb0]
focus:ring-offset-2
focus:ring-offset-[#0d2626]
```

### Keyboard Navigation

- All buttons must be keyboard accessible
- Tab order must be logical (top to bottom)
- Focus indicators must be visible
- Hover states must also apply to focus

---

## 11. Brand Assets Checklist

### Required Files

- [x] `/public/logo-final-optimized.png` - 86KB, transparent, perfect quality
- [x] `src/components/ui/FastPassLogo.tsx` - Logo component with sizes/glow
- [x] `src/components/ui/StaticBackground.tsx` - Background system
- [x] `src/components/ui/button.tsx` - Button components
- [x] `src/components/ui/card.tsx` - Card components

### Color Variables (Recommendation)

Create `src/styles/colors.css`:
```css
:root {
  --color-neon-vert: #5cffb0;
  --color-light-gray: #B0B0B0;
  --color-dark-navy: #1a1f2e;
  --color-near-black: #0a0e1a;
  --color-bg-teal: #0d2626;
  --color-bg-navy: #1a1f3a;
  --color-bg-purple: #1e2640;
  --color-bg-dark: #1a1a2e;
}
```

---

## 12. Implementation Checklist for New Views

When creating a new page/view, ensure:

### Structure
- [ ] Uses `<StaticBackground />` (rendered globally)
- [ ] Wraps content in `relative z-10` container
- [ ] Uses `min-h-screen flex flex-col` for full height
- [ ] Includes proper header/main/footer sections

### Colors
- [ ] All headings use `text-[#5cffb0]`
- [ ] All body text uses `text-[#B0B0B0]`
- [ ] Cards use proper background (`transparent` or `#1a1f2e`)
- [ ] Borders use `border-[#5cffb0]` with appropriate opacity

### Typography
- [ ] Font sizes follow responsive scale (sm:, md:, lg:)
- [ ] Font weights match specification (bold/semibold/normal)
- [ ] Line height appropriate (`leading-tight` or `leading-relaxed`)

### Components
- [ ] Cards have `backdrop-blur` effect
- [ ] Glows use proper shadow syntax with Neon Vert
- [ ] Buttons use gradient or outline variants
- [ ] Spacing follows system (gap-6/8, mb-8/12/16)

### Effects
- [ ] Transitions set to 300ms
- [ ] Hover states defined for interactive elements
- [ ] Focus states use Neon Vert ring
- [ ] Proper z-index layering

### Responsive
- [ ] Breakpoints defined (sm:, md:, lg:)
- [ ] Grid adjusts to columns (1 → 2 → 3)
- [ ] Text sizes scale appropriately
- [ ] Spacing adjusts for mobile/desktop

### Accessibility
- [ ] Contrast ratios meet WCAG AA minimum
- [ ] Focus indicators visible
- [ ] Keyboard navigation functional
- [ ] Alt text for images/icons

---

## 13. Quick Reference

### Most Common Classes

```tsx
// Headings
className="text-[#5cffb0] text-4xl sm:text-7xl font-bold"          // H1
className="text-[#5cffb0] text-2xl sm:text-3xl font-semibold"     // H2
className="text-[#5cffb0] text-lg sm:text-xl font-semibold"       // H3

// Body Text
className="text-[#B0B0B0] text-base sm:text-lg font-normal leading-relaxed"

// Transparent Card
className="bg-transparent backdrop-blur-sm border border-[#5cffb0]
           shadow-[0_0_15px_rgba(92,255,176,0.3)] rounded-xl"

// Dark Card
className="bg-[#1a1f2e]/95 backdrop-blur-md border border-[#5cffb0]/30
           shadow-[0_0_20px_rgba(92,255,176,0.2)] rounded-xl"

// Primary Button
className="bg-gradient-to-r from-[#5cffb0] to-[#2C424C]
           hover:from-[#4de89d] hover:to-[#253740]
           text-[#0a0e1a] hover:text-white font-bold py-4 px-8 text-lg
           rounded-xl transition-colors duration-300"
```

---

## 14. Don'ts (Anti-Patterns)

### ❌ Never Do These

1. **Don't use bright/light backgrounds** - Always dark mode
2. **Don't use colors other than Neon Vert for headings** - Brand consistency
3. **Don't create solid white cards** - Use transparent or dark navy
4. **Don't skip backdrop blur** - Essential for glassmorphism
5. **Don't use sharp corners** - Always rounded (rounded-xl minimum)
6. **Don't forget responsive classes** - Every size must scale
7. **Don't use different font families** - System stack only
8. **Don't create new shadows** - Use standardized glow patterns
9. **Don't skip transitions** - Always 300ms smooth animations
10. **Don't ignore z-index** - Background must stay at -10

### ❌ Deprecated Patterns (From Old Implementation)

- ~~`bg-[#050913]`~~ → Use gradient background instead
- ~~`bg-[#E8E8E8]`~~ → Use `bg-[#1a1f2e]/95` for CTA cards
- ~~White sparkles~~ → Removed, use orbs only
- ~~Static backgrounds~~ → Use animated orbs
- ~~Box shadows on containers~~ → Use glow shadows with Neon Vert

---

**End of Brand Standards Guide**

All implementations must adhere to these standards. When in doubt, reference the production landing page (`src/pages/Index.tsx`) as the source of truth.
