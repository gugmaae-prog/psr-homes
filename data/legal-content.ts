/**
 * Complete text supplied in the November 2026 PSR Homes PDFs.
 * Only PDF page furniture and line wrapping are removed.
 * Terms source SHA-256: c09dc64543dc066d75316f31831abf717b55a894a85bf04c775856a08de85d35
 * FAQ source SHA-256: 3e6e12829fd33146034e98f03230fbe4d5a32c22544f6c21640ca6a2c4ddf513
 */

type TermsContent = {
  readonly title: string;
  readonly updated: string;
  readonly sections: ReadonlyArray<{
    readonly heading: string;
    readonly paragraphs: readonly string[];
  }>;
};

type FaqContent = {
  readonly title: string;
  readonly sections: ReadonlyArray<{
    readonly heading: string;
    readonly questions: ReadonlyArray<{ readonly question: string; readonly answer: string }>;
  }>;
};

export const termsContent: TermsContent = {
  "title": "Terms & Conditions",
  "updated": "Last updated: November 2026",
  "sections": [
    {
      "heading": "1. About us",
      "paragraphs": [
        "This website (psrhomes.ae) is operated by PSR Homes Real Estate LLC, registered as P S R Homes Real Estate L.L.C, a real estate brokerage licensed in Dubai (DED Licence No. 1537469, RERA ORN 54275). Our office is at Office 1504 A, DAMAC Smart Heights, Barsha Heights, Dubai, UAE."
      ]
    },
    {
      "heading": "2. Accepting these terms",
      "paragraphs": [
        "By using this website, you agree to these Terms & Conditions and our Privacy Policy. If you do not agree, please do not use the website."
      ]
    },
    {
      "heading": "3. Our services",
      "paragraphs": [
        "PSR Homes is a real estate broker. We are not the developer of the projects shown on this website. We help buyers, sellers, landlords, tenants and investors with property search, project comparison and transaction support. Any purchase, sale or lease is governed by the contracts signed between the parties and the developer, and by the rules of the Dubai Land Department and RERA."
      ]
    },
    {
      "heading": "4. Property information",
      "paragraphs": [
        "Property details, prices, payment plans, sizes, handover dates and availability are provided for general guidance only. They are based on information from developers and other sources and may change without notice. Images, renders and videos may be illustrative. The developer's official documents and your signed contract always take priority over information on this website. Please confirm all details with a PSR advisor before making any decision."
      ]
    },
    {
      "heading": "5. No investment, legal or financial advice",
      "paragraphs": [
        "Market commentary, yield examples, ROI figures and capital-growth scenarios on this website are for information only and are not guaranteed. Past performance does not guarantee future results. Content on this website is not investment, legal, tax or financial advice. You should seek independent professional advice before buying or investing."
      ]
    },
    {
      "heading": "6. AI assistant",
      "paragraphs": [
        "Our website includes an AI assistant (AI Sonu) to help you explore projects and organise your property search. Its answers are generated automatically and may be incomplete or inaccurate. They are not a substitute for advice from a PSR advisor. Prices, availability, returns, eligibility and other details must be confirmed by our team."
      ]
    },
    {
      "heading": "7. Enquiries and contact",
      "paragraphs": [
        "When you submit an enquiry, request a brochure or share your details, you agree that PSR Homes may contact you by phone, WhatsApp, SMS or email about your enquiry and related property opportunities. You can ask us to stop contacting you at any time."
      ]
    },
    {
      "heading": "8. Brochures and downloads",
      "paragraphs": [
        "Brochures, project dossiers and other downloads are provided for your personal use in evaluating a property. They may not be copied, resold or published without permission."
      ]
    },
    {
      "heading": "9. Intellectual property",
      "paragraphs": [
        "The PSR Homes name, logo, website design, text, images and videos are owned by or licensed to PSR Homes. Developer names, logos and project materials belong to their respective owners. You may not copy, reproduce or reuse website content without written permission."
      ]
    },
    {
      "heading": "10. Acceptable use",
      "paragraphs": [
        "You must not misuse this website. This includes attempting unauthorised access, interfering with its operation, scraping data, or submitting false or misleading information."
      ]
    },
    {
      "heading": "11. Third-party links and services",
      "paragraphs": [
        "The website may link to or use third-party services such as maps, messaging, analytics and property platforms. These are operated by third parties under their own terms, and PSR Homes is not responsible for their content or practices."
      ]
    },
    {
      "heading": "12. Limitation of liability",
      "paragraphs": [
        "To the extent permitted by UAE law, PSR Homes is not liable for any loss or damage arising from the use of this website or from reliance on information published on it, including any errors, omissions or changes in property information."
      ]
    },
    {
      "heading": "13. Privacy",
      "paragraphs": [
        "How we collect and use your personal information is explained in our Privacy Policy."
      ]
    },
    {
      "heading": "14. Changes to these terms",
      "paragraphs": [
        "We may update these Terms & Conditions from time to time. The latest version will always be published on this page with the date it was updated."
      ]
    },
    {
      "heading": "15. Governing law",
      "paragraphs": [
        "These Terms & Conditions are governed by the laws of the United Arab Emirates as applied in the Emirate of Dubai. Any dispute will be subject to the jurisdiction of the courts of Dubai."
      ]
    },
    {
      "heading": "16. Contact us",
      "paragraphs": [
        "PSR Homes Real Estate LLC, Office 1504 A, DAMAC Smart Heights, Barsha Heights, Dubai, UAE. Phone: +971 58 680 1148. Email: sales@psrhomes.ae."
      ]
    }
  ]
};

export const faqContent: FaqContent = {
  "title": "Frequently Asked Questions",
  "sections": [
    {
      "heading": "About PSR Homes",
      "questions": [
        {
          "question": "Who is PSR Homes?",
          "answer": "PSR Homes Real Estate LLC is a licensed real estate brokerage in Dubai (RERA ORN 54275). We advise buyers, owners and investors on off-plan and ready property across the UAE."
        },
        {
          "question": "Where is PSR Homes located?",
          "answer": "Office 1504 A, DAMAC Smart Heights, Barsha Heights (Tecom), Dubai, UAE. We are open Monday to Saturday, 10 AM to 8 PM."
        },
        {
          "question": "Which areas do you cover?",
          "answer": "All seven emirates, including Dubai, Abu Dhabi, Sharjah and Ras Al Khaimah."
        },
        {
          "question": "Do you help international investors?",
          "answer": "Yes. We work with investors from India and around the world, and can guide you through buying property in the UAE from abroad."
        },
        {
          "question": "Which developers do you work with?",
          "answer": "We work with leading UAE developers including Emaar, Aldar, Azizi, wasl, Modon, IMAN Developers and BEYOND."
        },
        {
          "question": "How do I contact PSR Homes?",
          "answer": "Call +971 58 680 1148, email sales@psrhomes.ae, or chat with AI Sonu on our website."
        }
      ]
    },
    {
      "heading": "113 Residences, Al Sufouh, Dubai",
      "questions": [
        {
          "question": "What is the starting price of 113 Residences?",
          "answer": "Prices start from AED 1,800,000 for a 1-bedroom apartment. 2-bedroom units start from AED 2,560,000 and 3-bedroom units from AED 3,650,000."
        },
        {
          "question": "What is the payment plan?",
          "answer": "20/30/50: 20% on booking, 30% during construction and 50% on handover."
        },
        {
          "question": "When is the handover?",
          "answer": "Handover is anticipated in Q2 2029."
        },
        {
          "question": "Who is the developer?",
          "answer": "IMAN Developers."
        },
        {
          "question": "What unit types are available?",
          "answer": "1, 2 and 3-bedroom apartments and 4-bedroom duplexes, from 689 to 3,250 sq ft. Selected 4-bedroom duplexes have private plunge pools. The building has only 113 homes."
        },
        {
          "question": "Where is 113 Residences located?",
          "answer": "In Al Sufouh, between Palm Jumeirah, Dubai Marina and Madinat Jumeirah, with quick access to Sheikh Zayed Road, Dubai Media City and Dubai Internet City."
        },
        {
          "question": "How do I book a unit or get the brochure?",
          "answer": "Request the project brief on the project page or call PSR Homes on +971 58 680 1148."
        }
      ]
    },
    {
      "heading": "Wyndham Residences Al Marjan Island, Ras Al Khaimah",
      "questions": [
        {
          "question": "What is the starting price?",
          "answer": "Prices start from AED 1,165,000."
        },
        {
          "question": "What is the payment plan?",
          "answer": "50/50. Ask our team for the full instalment schedule."
        },
        {
          "question": "When is the handover?",
          "answer": "Handover is anticipated in Q1 2029."
        },
        {
          "question": "Who is the developer?",
          "answer": "Divine One Group."
        },
        {
          "question": "What unit types are available?",
          "answer": "Studios and 1-bedroom apartments."
        },
        {
          "question": "Where is it located?",
          "answer": "On Al Marjan Island in Ras Al Khaimah, a beachfront destination on the UAE's northern coast."
        }
      ]
    },
    {
      "heading": "Arancia Yards 2, City of Arabia, Dubai",
      "questions": [
        {
          "question": "What is the starting price?",
          "answer": "Prices start from AED 1,250,000."
        },
        {
          "question": "What is the payment plan?",
          "answer": "40/60. Ask our team for the full instalment schedule."
        },
        {
          "question": "When is the handover?",
          "answer": "Handover is anticipated in Q2 2029."
        },
        {
          "question": "Who is the developer?",
          "answer": "BEYOND."
        },
        {
          "question": "What unit types are available?",
          "answer": "1, 2 and 3-bedroom apartments."
        }
      ]
    },
    {
      "heading": "Bashayer Final Phase, Hudayriyat Island, Abu Dhabi",
      "questions": [
        {
          "question": "Is Bashayer Final Phase still available?",
          "answer": "The developer has announced the final phase as sold out. PSR Homes handles resale enquiries, subject to a current owner listing."
        },
        {
          "question": "What was the launch price?",
          "answer": "The launch entry price was from AED 2,500,000 for the 1 to 4-bedroom residences. Resale prices depend on the unit."
        },
        {
          "question": "What was the payment plan and handover date?",
          "answer": "The launch payment plan was 50/50, with handover anticipated in Q1–Q2 2030."
        },
        {
          "question": "Who is the developer?",
          "answer": "Modon."
        },
        {
          "question": "What property types are in Bashayer?",
          "answer": "1 to 4-bedroom apartments, townhomes and penthouses, plus 4 and 5-bedroom villas, in a landscaped waterfront community."
        }
      ]
    },
    {
      "heading": "Fleurs de Jardin, District 11 Meydan, Dubai",
      "questions": [
        {
          "question": "What is the starting price?",
          "answer": "Prices start from AED 27,000,000."
        },
        {
          "question": "What is the payment plan?",
          "answer": "70/30. Ask our team for the full instalment schedule."
        },
        {
          "question": "When is the handover?",
          "answer": "Handover is anticipated in Q3 2028."
        },
        {
          "question": "Who is the developer?",
          "answer": "Amis."
        },
        {
          "question": "What property types are available?",
          "answer": "5 and 6-bedroom mansions."
        }
      ]
    },
    {
      "heading": "Dawn – O1NE District, Motor City, Dubai",
      "questions": [
        {
          "question": "What is Dawn at O1NE District?",
          "answer": "Dawn is a G+18 tower of 70 Grade A office units, the first of 6 towers in O1NE District, a commercial masterplan in Dubai Motor City."
        },
        {
          "question": "What is the starting price?",
          "answer": "Office units start from AED 5,000,000."
        },
        {
          "question": "What is the payment plan?",
          "answer": "50/50. Ask our team for the full instalment schedule."
        },
        {
          "question": "When is the handover?",
          "answer": "Handover is anticipated in Q1 2030."
        },
        {
          "question": "Who is the developer?",
          "answer": "Avenew Development, with Kora."
        },
        {
          "question": "What office sizes are available?",
          "answer": "Office units range from 1,960 to 5,479 sq ft."
        },
        {
          "question": "Where is it located?",
          "answer": "In Dubai Motor City, next to Dubai Autodrome and about 5 minutes from Sports City."
        }
      ]
    }
  ]
};
