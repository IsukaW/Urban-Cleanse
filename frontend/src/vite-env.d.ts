/// <reference types="vite/client" />

declare module 'leaflet' {
  namespace Icon {
    interface DefaultIconOptions {
      _getIconUrl?: string;
    }
  }
}
