import type {Metadata} from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export async function generateMetadata(): Promise<Metadata> {
  // ... same as before but I'll make it cleaner
  return {
    title: 'Base Quest Board',
    description: 'Explore the Base chain grid and collect gems!',
    other: {
      'fc:miniapp': JSON.stringify({
        version: 'next',
        imageUrl: `https://ais-pre-rfcfkobudkyqhzbpypxfqn-615601803900.asia-southeast1.run.app/hero.png`,
        button: {
          title: 'Launch Quest',
          action: {
            type: 'launch_miniapp',
            name: 'Base Quest Board',
            url: `https://ais-pre-rfcfkobudkyqhzbpypxfqn-615601803900.asia-southeast1.run.app`,
            splashImageUrl: `https://ais-pre-rfcfkobudkyqhzbpypxfqn-615601803900.asia-southeast1.run.app/splash.png`,
            splashBackgroundColor: '#0052FF',
          },
        },
      }),
    },
  };
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-slate-950 text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
