import { readJsonCached } from "./data";

export type CarouselQuote = {
  id: string;
  title: string;
  signature: string | null;
  volume: "i" | "ii";
  chapter: number;
  quote: string;
  verbatim: boolean;
};

export async function getCarouselQuotes(): Promise<CarouselQuote[]> {
  return readJsonCached<CarouselQuote[]>("carousel.json", []);
}
