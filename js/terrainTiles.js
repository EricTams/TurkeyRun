import { TILE_SIZE } from './config.js';

const TILE_TYPES = ['flat', 'flatLow', 'slopeUp', 'slopeDown', 'full'];

const TILE_FILE_NAMES = {
    flat:      'Flat',
    flatLow:   'Flat Low',
    slopeUp:   'Slope Up',
    slopeDown: 'Slope Down',
    full:      'Full',
};

const BIOME_TILE_SETS = {
    beach:     { folder: 'Area1',  prefix: 'Sand' },
    grass:     { folder: 'Area2',  prefix: 'Grass' },
    mountain:  { folder: 'Area34', prefix: 'Mountain' },
    moon:      { folder: 'Area34', prefix: 'Mountain' },
    spiritual: { folder: 'Area5',  prefix: 'Realm of Thought' },
};

const FALLBACK_BIOME = 'grass';

// (biome, tileType) -> Image
const tileCache = new Map();

function cacheKey(biome, tileType) {
    return `${biome}:${tileType}`;
}

function tilePath(folder, prefix, tileType) {
    return `./assets/sprites/Terrain/${folder}/${prefix}-${TILE_FILE_NAMES[tileType]}.png`;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
        if (img.complete && img.naturalWidth > 0) resolve(img);
    });
}

export async function loadTerrainTiles() {
    const uniqueSets = {};
    for (const [biome, set] of Object.entries(BIOME_TILE_SETS)) {
        const id = `${set.folder}/${set.prefix}`;
        if (!uniqueSets[id]) {
            uniqueSets[id] = { biomes: [], ...set };
        }
        uniqueSets[id].biomes.push(biome);
    }

    const promises = [];

    for (const setInfo of Object.values(uniqueSets)) {
        for (const tileType of TILE_TYPES) {
            const src = tilePath(setInfo.folder, setInfo.prefix, tileType);
            const p = loadImage(src)
                .then(img => {
                    for (const biome of setInfo.biomes) {
                        tileCache.set(cacheKey(biome, tileType), img);
                    }
                })
                .catch(() => {
                    // Missing tile -- fallback will be used at getTile() time
                });
            promises.push(p);
        }
    }

    await Promise.all(promises);
}

export function getTile(biomeName, tileType) {
    const img = tileCache.get(cacheKey(biomeName, tileType));
    if (img) return img;
    return tileCache.get(cacheKey(FALLBACK_BIOME, tileType)) || null;
}

export function getTileSize() {
    return TILE_SIZE;
}
