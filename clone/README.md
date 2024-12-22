# Modern React Template

A modern React template with TypeScript, Tailwind CSS, and Shadcn/UI components. This template provides a clean, responsive layout with a sidebar navigation and multiple pages.

## Features

- 🚀 Built with Vite for fast development
- 🎨 Styled with Tailwind CSS
- 📱 Fully responsive design
- 🌙 Dark mode support
- 🧩 Modular component structure
- 🔍 TypeScript for type safety
- 📊 React Query for data fetching
- 🛠 Modern UI components from Shadcn/UI

## Getting Started

1. Clone this template:
```bash
git clone <your-repo-url>
cd your-app-name
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 to view your app

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── Navigation.tsx
│   └── ui/
│       └── ... (UI components)
├── pages/
│   ├── Dashboard.tsx
│   ├── Page2.tsx
│   └── Page3.tsx
├── lib/
│   └── utils.ts
├── hooks/
├── App.tsx
└── index.css
```

## Customization

1. Update the app name in `package.json`
2. Modify the navigation items in `src/components/layout/Navigation.tsx`
3. Add your own pages in the `src/pages` directory
4. Customize the theme colors in `src/index.css`
5. Add additional UI components as needed

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Dependencies

- React 18
- TypeScript
- Tailwind CSS
- Wouter (for routing)
- React Query
- Lucide React (for icons)
- Radix UI primitives
- Class Variance Authority
- Tailwind Merge

## License

MIT 