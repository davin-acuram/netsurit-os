declare module "react-simple-maps" {
  import type { ReactNode, ComponentType, SVGProps } from "react";
  import type { GeoProjection } from "d3-geo";

  export interface GeographyFeature {
    rsmKey: string;
    id: string;
    properties: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    // A projection *function* (e.g. one already configured via
    // d3-geo's fitSize/fitExtent) is used as-is; a string name falls
    // back to react-simple-maps' own d3-geo lookup + projectionConfig.
    projection?: string | GeoProjection;
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
