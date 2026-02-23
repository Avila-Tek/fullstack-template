import { redirect } from 'next/navigation';

// Este componente es un fallback. El middleware se encarga del redirect principal.
export default function RootPage() {
  redirect('/login');
}
