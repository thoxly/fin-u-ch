export interface ParsedDocument {
  date: Date;
  number?: string;
  amount: number;
  payer?: string;
  payerInn?: string;
  payerKpp?: string;
  payerAccount?: string;
  receiver?: string;
  receiverInn?: string;
  receiverKpp?: string;
  receiverAccount?: string;
  purpose?: string;
  hash?: string;
}

export interface ParsedFile {
  documents: ParsedDocument[];
  companyAccountNumber?: string;
  stats: {
    documentsStarted: number;
    documentsFound: number;
    documentsSkipped: number;
    documentsInvalid: number;
    documentTypesFound: string[];
    skippedDocumentTypes: Array<{ type: string; count: number }>;
  };
}
