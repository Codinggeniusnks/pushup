import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'PushUp — Every rep counts.', description: 'Move with purpose. Count your push-ups, track your progress, and get stronger together.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f8f9fb' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
