import { redirect } from 'next/navigation';

// Canonical Terms of Service is at /terms — redirect all traffic here
export default function TermsOfServiceRedirect() {
  redirect('/terms');
}
