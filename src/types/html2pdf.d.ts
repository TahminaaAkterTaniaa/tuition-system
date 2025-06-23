declare module 'html2pdf.js' {
  export interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      [key: string]: any;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: 'portrait' | 'landscape';
      [key: string]: any;
    };
    pagebreak?: {
      mode?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface Html2Pdf {
    from(element: HTMLElement): Html2Pdf;
    set(options: Html2PdfOptions): Html2Pdf;
    save(): Promise<void>;
    toPdf(): any;
    get(callback: Function): Html2Pdf;
    output(type: string, options?: any): any;
    then(callback: Function): Html2Pdf;
    catch(callback: Function): Html2Pdf;
  }

  export default function(): Html2Pdf;
}
