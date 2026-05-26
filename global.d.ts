interface TallyPopupOptions {
  width?: number;
  overlay?: boolean;
  layout?: "default" | "modal";
  onSubmit?: (payload: Record<string, unknown>) => void;
  onClose?: () => void;
}

interface Window {
  Tally?: {
    openPopup(formId: string, options?: TallyPopupOptions): void;
    closePopup(formId: string): void;
  };
}
