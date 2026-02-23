import * as React from 'react';

export function CheckoutCancelMessage(): React.ReactElement {
  return (
    <div className="text-center space-y-2">
      <h2 className="text-xl font-semibold text-amber-700">
        Checkout Cancelled
      </h2>
      <p className="text-muted-foreground">
        You cancelled the checkout process. No charges were made to your
        account.
      </p>
    </div>
  );
}
