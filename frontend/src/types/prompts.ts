export interface PromptTemplate {
  id: string;
  title: string;
  module: "text-to-image" | "multi-view" | "image-edit" | "fusion" | "grayscale-relief";
  english: string;
  chinese: string;
  note?: string;
}
