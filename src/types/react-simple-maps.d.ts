declare module "react-simple-maps" {
  import type { ReactNode, ComponentType, SVGProps } from "react";

  export interface GeographyFeature {
    rsmKey: string;
    id: string;
    properties: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: unknown;
    children: (args: { geographies: GeographyFeature[] }) => ReactNode;
  }

  export interface GeographyProps extends Omit<SVGProps<SVGPathElement>, "style"> {
    geography: GeographyFeature;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
}
