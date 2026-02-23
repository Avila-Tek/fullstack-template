import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { CreditCard } from 'lucide-react';

export function CheckoutPlaceholder() {
  return (
    <Card className="border border-secondary bg-surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Checkout
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm txt-quaternary-500 py-4">
          Checkout coming soon
        </p>
      </CardContent>
    </Card>
  );
}
