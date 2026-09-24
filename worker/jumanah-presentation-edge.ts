type JumanahEdgeEnv = {
  PSR_ORIGIN: Fetcher;
};

/**
 * Keep the public Jumanah URL on the main PSR hostname while delegating the
 * presentation itself to the current PSR application service. The previous
 * edge worker rendered a separate legacy PDF hub here, which meant the
 * profile URL could lag behind the current three-report presentation.
 */
export default {
  async fetch(request: Request, env: JumanahEdgeEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === "www.psrhomes.ae") {
      url.hostname = "psrhomes.ae";
      return Response.redirect(url.toString(), 301);
    }
    return env.PSR_ORIGIN.fetch(request);
  },
};
