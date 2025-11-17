import { Merchant } from '../types';

export interface MessageTemplates {
  welcome: string;
  menu: string;
  orderConfirmation: string;
  paymentLink: string;
  orderStatus: string;
  thankYou: string;
  clarification: string;
  cartSummary: string;
  paymentOptions: string;
}

export interface LocalizedTemplates {
  en: MessageTemplates;
  sn: MessageTemplates; // Shona
  zu: MessageTemplates; // Zulu
  af: MessageTemplates; // Afrikaans
}

const defaultTemplates: LocalizedTemplates = {
  en: {
    welcome: "Welcome to {{businessName}}! 🍽️ How can we help you today?",
    menu: "📋 *Our Menu*\n\n{{menuItems}}\n\nJust tell me what you'd like! For example: '2 Sadza & Beef Stew'",
    orderConfirmation: "✅ Order #{{orderNumber}} confirmed!\n\nTotal: {{currency}} {{total}}\nItems: {{items}}\n\nThank you {{customerName}}!",
    paymentLink: "💳 Please complete your payment:\n{{paymentLink}}\n\nOrder will be prepared once payment is confirmed.",
    orderStatus: "📦 Order #{{orderNumber}} status: {{status}}\n\nEstimated delivery: {{estimatedTime}}",
    thankYou: "🙏 Thank you for your order! We'll notify you when it's ready.",
    clarification: "🤔 I'm not sure I understood that. Could you please tell me which items you'd like and how many?",
    cartSummary: "🛒 *Your Cart*\n\n{{cartItems}}\n\n*Total: {{currency}} {{total}}*",
    paymentOptions: "💰 *Payment Options:*\n{{options}}\n\nPlease select your preferred payment method."
  },
  sn: {
    welcome: "Mauya ku {{businessName}}! 🍽️ Tingakubatsirei sei nhasi?",
    menu: "📋 *Menu Yedu*\n\n{{menuItems}}\n\nTiudzei zvamunoda! Semuenzaniso: '2 Sadza neMufushwa'",
    orderConfirmation: "✅ Order #{{orderNumber}} yabvumirwa!\n\nTotal: {{currency}} {{total}}\nZvinhu: {{items}}\n\nTinokutendai {{customerName}}!",
    paymentLink: "💳 Ndapota bhadhara pano:\n{{paymentLink}}\n\nTichagadzira order yenyu kana mari yabhadharwa.",
    orderStatus: "📦 Order #{{orderNumber}} mamiriro: {{status}}\n\nTinofungidzira kusvika: {{estimatedTime}}",
    thankYou: "🙏 Tinokutendai neorder yenyu! Tichakuzivisai kana yagadzirwa.",
    clarification: "🤔 Handina kunzwisisa izvo. Ndapota ndiudzei zvinhu zvamunoda uye zvingani?",
    cartSummary: "🛒 *Cart Yenyu*\n\n{{cartItems}}\n\n*Total: {{currency}} {{total}}*",
    paymentOptions: "💰 *Nzira Dzekubhadhara:*\n{{options}}\n\nSarudzai nzira yamunoda."
  },
  zu: {
    welcome: "Siyakwamukela ku-{{businessName}}! 🍽️ Singakusiza kanjani namuhla?",
    menu: "📋 *Imenyu Yethu*\n\n{{menuItems}}\n\nSitshele nje ukuthi ufunani! Isibonelo: '2 Pap neSitshulu'",
    orderConfirmation: "✅ I-oda #{{orderNumber}} iqinisekisiwe!\n\nIsamba: {{currency}} {{total}}\nIzinto: {{items}}\n\nSiyabonga {{customerName}}!",
    paymentLink: "💳 Sicela ukhokhe lapha:\n{{paymentLink}}\n\nI-oda izolungiswa uma ukukhokha kuqinisekisiwe.",
    orderStatus: "📦 I-oda #{{orderNumber}} isimo: {{status}}\n\nIsilinganiso sokulethwa: {{estimatedTime}}",
    thankYou: "🙏 Siyabonga nge-oda yakho! Sizokwazisa uma isilungile.",
    clarification: "🤔 Angiqondi lokho. Sicela usitshele ukuthi yiziphi izinto ozifunayo nezingaki?",
    cartSummary: "🛒 *Itroli Yakho*\n\n{{cartItems}}\n\n*Isamba: {{currency}} {{total}}*",
    paymentOptions: "💰 *Izindlela Zokukhokha:*\n{{options}}\n\nKhetha indlela oyithandayo."
  },
  af: {
    welcome: "Welkom by {{businessName}}! 🍽️ Hoe kan ons jou vandag help?",
    menu: "📋 *Ons Spyskaart*\n\n{{menuItems}}\n\nSê net vir ons wat jy wil hê! Byvoorbeeld: '2 Pap en Vleis'",
    orderConfirmation: "✅ Bestelling #{{orderNumber}} bevestig!\n\nTotaal: {{currency}} {{total}}\nItems: {{items}}\n\nDankie {{customerName}}!",
    paymentLink: "💳 Betaal asseblief hier:\n{{paymentLink}}\n\nBestelling sal voorberei word sodra betaling bevestig is.",
    orderStatus: "📦 Bestelling #{{orderNumber}} status: {{status}}\n\nGeskatte aflewering: {{estimatedTime}}",
    thankYou: "🙏 Dankie vir jou bestelling! Ons sal jou laat weet wanneer dit gereed is.",
    clarification: "🤔 Ek verstaan nie dit nie. Kan jy asseblief sê watter items jy wil hê en hoeveel?",
    cartSummary: "🛒 *Jou Mandjie*\n\n{{cartItems}}\n\n*Totaal: {{currency}} {{total}}*",
    paymentOptions: "💰 *Betaalopsies:*\n{{options}}\n\nKies jou voorkeur betaalmetode."
  }
};

class LocalizationService {
  private templates: LocalizedTemplates = defaultTemplates;

  getTemplates(language: string = 'en'): MessageTemplates {
    return this.templates[language as keyof LocalizedTemplates] || this.templates.en;
  }

  formatMessage(
    template: string,
    variables: Record<string, string | number>
  ): string {
    let formatted = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      formatted = formatted.replace(regex, String(value));
    });
    return formatted;
  }

  getMerchantLanguage(merchant: Merchant): string {
    // Determine language based on region and settings
    if (merchant.region === 'ZW') {
      return 'sn'; // Default to Shona for Zimbabwe
    } else if (merchant.region === 'ZA') {
      return 'af'; // Default to Afrikaans for South Africa
    }
    return 'en';
  }

  getSupportedLanguages(): Array<{ code: string; name: string; flag: string }> {
    return [
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'sn', name: 'Shona', flag: '🇿🇼' },
      { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
      { code: 'af', name: 'Afrikaans', flag: '🇿🇦' }
    ];
  }
}

export const localizationService = new LocalizationService();