declare module "virtual:tour-assets" {
  const assets: {
    readonly audio: boolean;
    readonly timing: boolean;
    /** Changes whenever the recording or its timings change. */
    readonly version: string;
  };
  export default assets;
}
