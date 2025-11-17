import { PaymentMethod } from '../types';

export const paymentMethods: PaymentMethod[] = [
  { id: 'ecocash', name: 'EcoCash', region: 'ZW', type: 'mobile' },
  { id: 'onemoney', name: 'OneMoney', region: 'ZW', type: 'mobile' },
  { id: 'bank_transfer', name: 'Bank Transfer', region: 'ZW', type: 'bank' },
  { id: 'eft', name: 'EFT', region: 'ZA', type: 'bank' },
  { id: 'payfast', name: 'PayFast', region: 'ZA', type: 'digital' },
  { id: 'snapscan', name: 'SnapScan', region: 'ZA', type: 'digital' },
];

class PaymentService {
  async createPaymentLink(
    orderId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    region: 'ZW' | 'ZA'
  ): Promise<string> {
    // Simulate API call to payment provider
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock payment links
    const baseUrls = {
      ZW: {
        ecocash: 'https://ecocash.co.zw/pay',
        onemoney: 'https://onemoney.co.zw/pay',
        bank_transfer: 'https://banknet.co.zw/transfer'
      },
      ZA: {
        eft: 'https://banking.standardbank.co.za/pay',
        payfast: 'https://payfast.co.za/eng/process',
        snapscan: 'https://pos.snapscan.co.za/pay'
      }
    };

    const baseUrl = baseUrls[region]?.[paymentMethod as keyof typeof baseUrls[typeof region]];
    if (!baseUrl) {
      throw new Error(`Payment method ${paymentMethod} not supported in ${region}`);
    }

    return `${baseUrl}?order=${orderId}&amount=${amount}&currency=${currency}`;
  }

  async verifyPayment(orderId: string, paymentMethod: string): Promise<boolean> {
    // Simulate webhook verification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success for demo (90% success rate)
    return Math.random() > 0.1;
  }

  getPaymentMethodsForRegion(region: 'ZW' | 'ZA'): PaymentMethod[] {
    return paymentMethods.filter(pm => pm.region === region);
  }
}

export const paymentService = new PaymentService();