class Cache {
  constructor() {
    this.staticAssetsRoot_rasters = "./assets/rasters/";
    this.staticAssets = new Map();
    this.requests = new Set();
  }
  cacheAsset(asset) {
    if (asset) {
      this.staticAssets.set(asset.url, false);
      const Img = new Image();
      const isReady = () => {
        asset.value = Img;
        asset.ready = true;
        asset.inCache = true;
        return this.staticAssets.set(asset.url, asset);
      };
      Img.onload = isReady;
      asset.ready = false;
      Img.src = asset.url;
    }
  }
  add(queue) {
    const requests = (queue instanceof Array) ? new Set(queue) : new Set([queue]);
    const assets = requests[Symbol.iterator]();
    let asset_identifiers = new Set();
    let next = assets.next();
    while (next.value && !next.done) {
      const url = `${this.staticAssetsRoot_rasters}${next.value}`;
      asset_identifiers.add(url);
      const inCache = this.staticAssets.has(url);
      if (!inCache) {
        const asset = {
          url,
          inCache
        };
        this.cacheAsset(asset);
      }
      next = assets.next();
    }
    const poller = (resolve, reject) => {
      let resolved = false;
      const poll = window.setInterval(
        () => {
          resolved = this.isReady(asset_identifiers);
          if (resolved) {
            window.clearInterval(poll);
            resolve(this.staticAssets);
          }
        }, 5
      );
    };
    return new Promise(poller);
  }
  isReady(asset_identifiers) {
    let readiness = 0;
    for (let id of asset_identifiers) {
      if (this.staticAssets.get(id)
        .ready === true) {
        readiness++;
      }
    }
    return (readiness == asset_identifiers.size);
  }
}