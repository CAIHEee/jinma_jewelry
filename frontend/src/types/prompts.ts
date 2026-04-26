export interface PromptTemplate {
  id: string;
  title: string;
  module:
    | "text-to-image"
    | "multi-view"
    | "image-edit"
    | "fusion"
    | "grayscale-relief"
    | "product-refine"
    | "gemstone-design"
    | "upscale";
  content: string;
  note?: string;
}
