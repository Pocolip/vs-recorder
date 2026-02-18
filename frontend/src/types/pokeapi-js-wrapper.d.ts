declare module "pokeapi-js-wrapper" {
  export class Pokedex {
    constructor(options?: { cache?: boolean; timeout?: number; cacheImages?: boolean });
    getPokemonByName(name: string): Promise<any>;
  }
}
