import { Injectable } from '@nestjs/common';

@Injectable()
export class KycService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.IDENTRO_BASE_URL || 'https://api.identro.ng';
    this.apiKey = process.env.IDENTRO_API_KEY || '';
  }

  async verifyNin(nin: string) {
    const url = `${this.baseUrl}${process.env.IDENTRO_NIN_VERIFY_URL || '/merchant-api/nin/verify'}`;
    console.log('NIN verify URL:', url);
    console.log('NIN verify body:', { nin });
    const result = await this.postJson(url, {
      nin,
      forceRefresh: false,
      consentCaptured: true,
      consentReference: 'OGANCORE-REGISTRATION',
      idempotencyKey: `OGANCORE-NIN-${Date.now()}`,
    });
    console.log('NIN verify response:', JSON.stringify(result));
    return result;
  }

  async verifyCac(registrationNumber: string) {
    const url = `${this.baseUrl}${process.env.IDENTRO_CAC_BASIC_URL || '/merchant-api/cac/basic'}`;
    return this.postJson(url, {
      serviceType: 'CAC_BASIC_VERIFICATION',
      registrationNumber,
      companyType: 'COMPANY',
      consentCaptured: true,
      idempotencyKey: `OGANCORE-CAC-${Date.now()}`,
    });
  }

  private async postJson(url: string, body: Record<string, any>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });
    console.log('Response status:', response.status);
    const data = await response.json();
    return data;
  }
}