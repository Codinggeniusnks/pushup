import { notFound } from 'next/navigation';
import { AppRoot } from '@/components/app-root';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{view:string}> }) {
 const {view}=await params;
 if (!['activity','competition','groups','profile','workout'].includes(view)) notFound();
 return <AppRoot view={view} />;
}
