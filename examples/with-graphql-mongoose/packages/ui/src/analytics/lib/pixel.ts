type Config = {
  pixelId: string;
  enabled: boolean;
};

let fb: any = null;
let fbLoaded = false;

export function facebookPixel(_config: Config) {
  return {
    name: 'facebook-pixel',
    async initialize({ config }: { config: Config }) {
      const { pixelId } = config;
      if (typeof window !== 'undefined') {
        fb = (await import('react-facebook-pixel')).default;
        if (!fbLoaded) {
          fb.init(pixelId, {
            autoConfig: true,
            debug: true,
          });
          fbLoaded = true;
        }
      }
    },
    page: (): void => {
      fb.pageView();
    },
    track: ({ payload }: { payload?: any }) => {
      fb.track(payload.event, payload.properties);
    },
    loaded: (): boolean => {
      return fbLoaded;
    },
  };
}
