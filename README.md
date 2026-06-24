# NexusConvert

NexusConvert is a modern currency-conversion dashboard built with React and TypeScript. It provides live exchange-rate calculations, wallet-based conversions, currency baskets, rate alerts, and a responsive interface.

## Features

- Convert between supported currencies
- Display live exchange rates
- Manage multi-currency wallet balances
- Validate insufficient wallet balances
- Prevent invalid same-currency conversions
- Calculate values across a currency basket
- Create custom exchange-rate alerts
- View conversion history
- Export transaction history as CSV
- Store wallet and activity data in the browser
- Use cached exchange rates when the live service is unavailable

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- TanStack Query
- Recharts
- Papa Parse
- Sonner

## Getting Started

Clone the repository:

```bash
git clone https://github.com/Satyajeetbu24/Nexusconvert.git
cd Nexusconvert
````

Install dependencies:

```bash
corepack pnpm install
```

Start the development server:

```bash
corepack pnpm dev
```

> The current repository references pnpm catalogue and workspace dependencies. Its workspace configuration may need to be restored before dependency installation works from a fresh clone.

## Project Structure

```text
src/
├── components/    Reusable interface components
├── hooks/         Custom React hooks
├── lib/           Shared utilities
└── App.tsx        Main application and conversion logic
```

## Contributing

1. Create a focused branch from `main`.
2. Make one logical change.
3. Review and test the changed files.
4. Commit with a descriptive message.
5. Push the branch.
6. Open a pull request against `main`.

## Disclaimer

NexusConvert is an educational project. Exchange rates may be delayed or replaced with cached values. Do not treat the displayed information as financial advice.
