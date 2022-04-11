import SimplexNoise from 'simplex-noise';
import * as THREE from 'three';
import { PointLight, PCFShadowMap, MeshPhysicalMaterial, TextureLoader, Vector2, BoxGeometry, CylinderGeometry, Color, WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding, PMREMGenerator, FloatType, Mesh, MeshStandardMaterial } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'
import { DoubleSide } from 'three';
import { SphereGeometry } from 'three';


// Scene  
const scene = new THREE.Scene();
scene.background = new Color('#FFEECC');

// Camera 
//camera avec un champ frustum de ratio largeur sur hauteur , une vue vertical de 45 unité ,vue  proche de 0.1 unité de mesure et vue jusqu'a 1000 unités de mesure  
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
// Position de la camera
camera.position.set(-17, 31, 33);

// Renderer 
// WebGL renderer met en place le rendu visible client 
const renderer = new WebGLRenderer({ antialias: true });
// taille du rendu largeur sur hauteur 
renderer.setSize(innerWidth, innerHeight);
// Regler la palette de couleur afin quel soit plus monotone 
renderer.toneMapping = ACESFilmicToneMapping;
// encodage couleur standard rouge vert bleu 
renderer.outputEncoding = sRGBEncoding;
// correction de la lumiere celon un model physique et non design 
renderer.physicallyCorrectLights = true;
// rajouter la cartographie et projection des l'ombres 
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
document.body.appendChild(renderer.domElement);

//lumieres
const light = new PointLight(new Color("#FFCBBE").convertSRGBToLinear(), 80, 200);
light.position.set(10, 20, 10);
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
scene.add(light);

// Controle obitale via la souris 
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

// variable qui servira pour l'environnement de geotraitement 
let envmap;

clouds();


// constante des hauteurs des differentes  textures
const MAX_HEIGHT = 8;
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DARKDIRT_HEIGHT = MAX_HEIGHT * 0;


// differents types d'hexagones par texture
let stoneGeo = new BoxGeometry(0, 0, 0);
let grassGeo = new BoxGeometry(0, 0, 0);
let sandGeo = new BoxGeometry(0, 0, 0);
let dirtGeo = new BoxGeometry(0, 0, 0);
let darkdirtGeo = new BoxGeometry(0, 0, 0);

// fonctions permettant de crée les formes hexagonales des reliefs
function hexGeometry(height, position) {
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
  geo.translate(position.x, height * 0.5, position.y);

  return geo;
};

// fonction qui gere les differents types de textures sur les hexagones ainsi que les stuctures quelles contiennent  
function makeHex(height, position) {
  let geo = hexGeometry(height, position);

  if (height > STONE_HEIGHT) {
    stoneGeo = mergeBufferGeometries([geo, stoneGeo]);
    if (Math.random() > 0.8) {
      stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
    }
  } else if (height > DIRT_HEIGHT) {
    dirtGeo = mergeBufferGeometries([geo, dirtGeo]);
    if (Math.random() > 0.8) {
      grassGeo = mergeBufferGeometries([grassGeo, tree(height, position)])
    }
  } else if (height > GRASS_HEIGHT) {
    grassGeo = mergeBufferGeometries([geo, grassGeo]);
  } else if (height > SAND_HEIGHT) {
    sandGeo = mergeBufferGeometries([geo, sandGeo]);
    if (Math.random() > 0.8 && stoneGeo) {
      stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
    }
  } else if (height > DARKDIRT_HEIGHT) {
    darkdirtGeo = mergeBufferGeometries([geo, darkdirtGeo]);
  }
}

//fonction qui crée les stucture hexagonales a la base de la carte 
function hexMesh(geo, map) {
  let mat = new MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map
  });
  let mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}


// gerer la disposition puis l'espacement entre les cotés des stuctures hexagonales
function tileToPosition(tileX, tileY) {
  return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535)
}

// fonction qui crée la structure des rochers sur la carte
function stone(height, position) {
  const px = Math.random() * 0.4;
  const pz = Math.random() * 0.4;

  const geo = new SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
  geo.translate(position.x + px, height, position.y + pz);
  return geo;
};

//fonction qui crée la structure des arbres
function tree(height, position) {
  const treeHeight = Math.random() * 1 + 1.25;

  const geo = new CylinderGeometry(0, 1.5, treeHeight, 3);
  geo.translate(position.x, height + treeHeight * 0 + 1, position.y);

  const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3);
  geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);

  const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3);
  geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);

  return mergeBufferGeometries([geo, geo2, geo3]);
}

//fonction qui crée la structure des nuages et les disposent de maniere aléatoire
function clouds() {
  let geo = new SphereGeometry(0, 0, 0);
  let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);

  for (let i = 0; i < count; i++) {
    const puff = new SphereGeometry(1, 7, 7);
    const puff2 = new SphereGeometry(1.3, 7, 7);
    const puff3 = new SphereGeometry(0.9, 7, 7);

    puff.translate(-1.85, Math.random() * 0.3, 0);
    puff2.translate(0, Math.random() * 0.3, 0);
    puff3.translate(1.85, Math.random() * 0.3, 0);

    const cloudGeo = mergeBufferGeometries([puff, puff2, puff3]);
    cloudGeo.translate(
      Math.random() * 20 - 10,
      Math.random() * 7 + 7,
      Math.random() * 20 - 10,
    );
    cloudGeo.rotateY(Math.random() * Math.PI * 2);
    geo = mergeBufferGeometries([geo, cloudGeo]);
  }

  const mesh = new Mesh(
    geo,
    new MeshStandardMaterial({
      envMap: envmap,
      envMapIntensity: 0.75,
      flatShading: true,
    })
  );

  scene.add(mesh);
}


(async function () {
  // utilisation d'un environnement de geotraitement afin de donner differents effets de flou sur les models  
  let pmrem = new PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync('./assets/envmap.hdr');
  envmap = pmrem.fromEquirectangular(envmapTexture).texture;
  //textures des differents elements de la map 
  let textures = {
    dirt: await new TextureLoader().loadAsync("./assets/dirt.png"),
    darkdirt: await new TextureLoader().loadAsync("./assets/darkdirt.png"),
    grass: await new TextureLoader().loadAsync("./assets/grass.png"),
    stone: await new TextureLoader().loadAsync("./assets/stone.png"),
    water: await new TextureLoader().loadAsync("./assets/water.png"),
    sand: await new TextureLoader().loadAsync("./assets/sand.png"),
  };
  //variable d'appel de SimplexNoise
  const simplex = new SimplexNoise();

  // iteration des formes hexagonales 
  for (let i = -15; i <= 15; i++) {
    for (let j = -15; j <= 15; j++) {

      // variable comprenant la disposition des hexagones 
      let position = tileToPosition(i, j);

      // calcule et regulation de la taille que prennent les formes hexagonales si le radius dépasse 16 unités on passe au reste de la fonction loop 
      if (position.length() > 16) continue;

      // utilisation de SimplexNoise afin de crée les differents niveaux de reliefs en random
      let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
      noise = Math.pow(noise, 1.5);
      makeHex(noise * MAX_HEIGHT, position);
    }
  }
  // object 3D utilisant l'environnement de geotraitement 
  makeHex(3, new Vector2(0, 0));

  let stoneMesh = hexMesh(stoneGeo, textures.stone);
  let grassMesh = hexMesh(grassGeo, textures.grass);
  let dirtMesh = hexMesh(dirtGeo, textures.dirt);
  let darkdirtMesh = hexMesh(darkdirtGeo, textures.darkdirt);
  let sandMesh = hexMesh(sandGeo, textures.sand);

  scene.add(stoneMesh, dirtMesh, darkdirtMesh, sandMesh, grassMesh)

  //structure de l'eau 
  let seaMesh = new Mesh(
    new CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
    new MeshPhysicalMaterial({
      envMap: envmap,
      color: new Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      thickness: 1.5,
      envMapIntensity: 0.2,
      roughness: 1,
      metalness: 0.025,
      roughnessMap: textures.water,
      metalnessMap: textures.water,
    })
  );
  seaMesh.receiveShadow = true;
  seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0)
  scene.add(seaMesh)

  //structure laterales du socle 
  let mapContainer = new Mesh(
    new CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt,
      envMapIntensity: 0.2,
      side: DoubleSide,
    })
  );
  mapContainer.receiveShadow = true;
  mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
  scene.add(mapContainer);

  // structure fond du socle 
  let mapFloor = new Mesh(
    new CylinderGeometry(18.5, 18.5, MAX_HEIGHT * 0.1, 50),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.darkdirt,
      envMapIntensity: 0.1,
      side: DoubleSide,
    })
  );
  mapFloor.receiveShadow = true;
  mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
  scene.add(mapFloor)

  //Fonction d'animation loop 
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera)
  });
})();