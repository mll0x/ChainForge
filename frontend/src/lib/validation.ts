import { isAddress } from "viem";

export function isValidEthAddress(value: string): boolean {
  return isAddress(value, { strict: false });
}

export function isValidAmount(value: string): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}
