'use client';

import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { checkoutRoutes } from '../../domain/checkout.constants';

const REDIRECT_DELAY_SECONDS = 5;

export function CheckoutSuccessMessage(): React.ReactElement {
  const router = useRouter();
  const [countdown, setCountdown] = React.useState(REDIRECT_DELAY_SECONDS);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      router.push(checkoutRoutes.dashboard);
    }
  }, [countdown, router]);

  function handleGoToDashboard() {
    router.push(checkoutRoutes.dashboard);
  }

  return (
    <Card className="border border-secondary bg-surface">
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-full bg-success-primary/10 p-3">
            <CheckCircle className="h-10 w-10 txt-success-primary-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-center">
            Payment successful!
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CardDescription className="text-center text-base txt-tertiary-600">
          Your subscription has been activated successfully.
        </CardDescription>
        <div className="text-center">
          <p className="text-sm txt-quaternary-500">
            Redirecting to dashboard in {countdown} seconds...
          </p>
        </div>
        <Button onClick={handleGoToDashboard} className="w-full">
          Go to Dashboard Now
        </Button>
      </CardContent>
    </Card>
  );
}
