import SimplexNoise from 'simplex-noise';
import * as THREE from 'three';
import { Vector2, BoxGeometry, CylinderGeometry, Color, WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding, PMREMGenerator, FloatType, Mesh, MeshStandardMaterial } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'
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
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

// variable qui servira pour l'environnement de geotraitement 
let envmap;

// l'effet de relief sur la map procedural proviens d'une seule structure contenu dans une variable 
let hexagonGeometries = new BoxGeometry(0, 0, 0);

const MAX_HEIGHT = 10;

// fonctions permettant de crée les formes hexagonales des reliefs
function hexGeometry(height, position) {
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
  geo.translate(position.x, height * 0.5, position.y);

  return geo;
};

function makeHex(height, position) {
  let geo = hexGeometry(height, position);
  hexagonGeometries = mergeBufferGeometries([hexagonGeometries, geo])
}


// gerer la disposition puis l'espacement entre les cotés des figures hexagonales
function tileToPosition(tileX, tileY) {
  return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535)
}

//Fonction Loop 
(async function () {
  // utilisation d'un environnement de geotraitement afin de donner differents effets de flou sur les models  
  let pmrem = new PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync('./assets/envmap.hdr');
  envmap = pmrem.fromEquirectangular(envmapTexture).texture;

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
  let hexagonMesh = new Mesh(
    hexagonGeometries,
    new MeshStandardMaterial({
      envMap: envmap,
      flatShading: true,
    })
  );
  scene.add(hexagonMesh);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera)
  });
})();