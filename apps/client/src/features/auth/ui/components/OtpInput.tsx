import {
  InputOtp,
  InputOtpGroup,
  InputOtpSlot,
} from '@repo/ui/components/inputOtp';

interface OtpInputProps {
  field: {
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    name: string;
  };
  disabled?: boolean;
  className?: string;
}

const OTP_LENGTH = 6;

export function OtpInput({ field, disabled, className }: OtpInputProps) {
  return (
    <InputOtp maxLength={OTP_LENGTH} disabled={disabled} {...field}>
      <InputOtpGroup className={className}>
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <InputOtpSlot key={index} index={index} />
        ))}
      </InputOtpGroup>
    </InputOtp>
  );
}
