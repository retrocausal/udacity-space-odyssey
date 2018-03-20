/*
 * @name: Cache - Forced use of newer built ins and syntactic sugar,
 * to rewrite what Udacity attempted to do with resources in the starter code
 * @ https://github.com/udacity/fend-project-memory-game
 * @ Description: A helper class, to cache assets, mostly static
 */
class Cache {
  constructor(prefix = "./assets/rasters/") {
    this.cache_key_prefix = prefix;
    this.staticAssets = new Map();
    this.requests = new Set();
  }
  cacheAsset(asset) {
    if (asset) {
      //Initialize the asset in cache
      //NOTE : DOES NOT mean, the asset is cached yet
      this.staticAssets.set(asset.url, false);
      //Create an image
      const Img = new Image();
      //On image load, the asset needs to be set "READY"
      const isReady = () => {
        asset.value = Img;
        asset.ready = true;
        return this.staticAssets.set(asset.url, asset);
      };
      Img.onload = isReady;
      //While the image is loading, asset is NOT ready!
      asset.ready = false;
      //Kick off load
      Img.src = asset.url;
    }
    return asset || false;
  }
  /*
   * @Description : Tries to imitate an asynchronous cache.add as in
   * a service worker. Add, should alone resolve or, reject a queue
   * @params[queue] : Accepts a queue, or a single asset
   */
  add(queue) {
    /*
     * Image loads, can take a while. Works them out async
     * then polls at a regular interval, to see if all assets in this call to add()
     * have loaded
     */
    return new Promise((resolve, reject) => {
      //Determine, If the passed argument, is a list, or not
      //If not, make a list
      const requests = (queue instanceof Array) ? new Set(queue) : new Set([queue]);
      // Set an iterator, to Iterate over the queue, alias requests
      const assets = requests[Symbol.iterator]();
      //Initialize a collector of assets' fully formed urls,
      //Which essentially are the keys in the cache map
      let asset_identifiers = new Set();
      //Set off iterator
      let next = assets.next();
      //Iteration over assets in queue
      while (next.value && !next.done) {
        //build identifiers / keys for the cache
        const url = `${this.cache_key_prefix}${next.value}`;
        //push them to the collector
        asset_identifiers.add(url);
        //Is the asset in cache?
        /*NOTE: Even if an image has not finished loading, if the cache has the key
         * Implies, that asset is IN cache
         */
        const inCache = this.staticAssets.has(url);
        //If not in cache, cache
        if (!inCache) {
          const asset = {
            url,
            name: (next.value.substr(0, next.value.lastIndexOf('.')) || next.value),
            extension: (next.value.substr(next.value.lastIndexOf('.') + 1, next.value.length) || 'png')
          };
          this.cacheAsset(asset);
        }
        // Keep iterating!!!
        next = assets.next();
      }
      //Once all assets in the request queue have been processed / cached
      //We need a poll at 'x' interval , to determine, if all assets are USEABLE!
      const poll = () => {
        //Check if all assets are loaded and useable
        //If they are, remove the poll, resolve the promise
        if (this.isReady(asset_identifiers)) {
          window.clearInterval(polly);
          resolve(asset_identifiers);
        }
      };
      //POLL
      const polly = window.setInterval(poll, 3);
    });
  }
  /*
   * @Description: Loops over a list of asset cache keys,
   * and determines if all are loaded and ready
   */
  isReady(asset_identifiers) {
    const readynessOnSetOfIDs = () => {
      //initialize parameter that identifies readiness
      //If the count of assets in queue of asset ids passed
      //Equals readiness, assets have been cached
      let readiness = 0;
      for (let id of asset_identifiers) {
        //gather the asset being investigated
        const asset = this.staticAssets.get(id);
        //If ready, mark ready
        if (asset.ready === true) {
          readiness++;
        }
      }
      //If all assets in the current queue have been cached and loaded,
      //return true else return false
      return (readiness == asset_identifiers.size);
    };
    const readinessOnSingleID = () => {
      //gather the asset being investigated
      const asset = this.staticAssets.get(asset_identifiers);
      //If ready, mark ready
      return (asset.ready === true);
    };
    return (asset_identifiers instanceof Set) ? readynessOnSetOfIDs() : readinessOnSingleID();
  }
  retrieve(Key) {
    const key = String(Key);
    return (key && this.staticAssets.has(key) && this.isReady(key)) ? this.staticAssets.get(key) : false;
  }
}