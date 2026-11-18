export interface FeatureParameter {
  name: string;
  caption: string;
  description: string;
  group: string;
  type: 'number' | 'bool' | 'string';
  value: number | boolean | string;
  units: 'mm' | '°' | '';
  control: {
    kind: 'spinbox' | 'checkbox' | 'text' | 'dropdown';
    min?: number;
    max?: number;
    step?: number;
    options?: { value: string; label: string }[];
  };
  condition?: { parameter: string; value: number | boolean | string };
}

export interface FeatureParameters {
  feature: string;
  features: string[];
  params: FeatureParameter[];
}

export interface BuiltFeature {
  stl: Uint8Array;
  step: Uint8Array;
  log: string;
}

export interface Engine {
  parameters(source: string, feature?: string): Promise<FeatureParameters>;
  build(source: string, values?: Record<string, number | boolean | string>, feature?: string): Promise<BuiltFeature>;
}

export const FONTS: string[];
export function fontsUsed(source: string): string[];
export function createEngine(options?: {
  locateFile?: (name: string) => string;
  loadFont?: (name: string) => Promise<ArrayBuffer | Uint8Array>;
  print?: (line: string) => void;
}): Promise<Engine>;
