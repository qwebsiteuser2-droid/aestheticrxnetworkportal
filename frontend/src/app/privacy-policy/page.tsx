import { redirect } from 'next/navigation';

// Canonical privacy policy is at /privacy — redirect all traffic here
export default function PrivacyPolicyRedirect() {
  redirect('/privacy');
}
