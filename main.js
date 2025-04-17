import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

function main() {

  let renderer;
  let scene, camera, orbitControl;

  init();
  render();

  const cube = createMesh();
  renderer.setAnimationLoop(animate(cube));

  function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.add( new THREE.GridHelper( 10, 20, 0x888888, 0x444444 ) );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set( 5, 2.5, 5 );
  
    orbitControl = new OrbitControls( camera, renderer.domElement );
    orbitControl.update();
    orbitControl.addEventListener( 'change', render );
  }

  function render() {
    renderer.render( scene, camera );
  }

  function createMesh() {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( { color: 'white' } );
    const mesh = new THREE.Mesh( geometry, material );

    const transformControl = new TransformControls( camera, renderer.domElement );
    transformControl.addEventListener( 'change', render );
    transformControl.addEventListener( 'dragging-changed', function (event) {
      orbitControl.enabled = ! event.value;
    });
    transformControl.attach(mesh);
    const gizmo = transformControl.getHelper();

    scene.add( mesh );
    scene.add( gizmo );

    return mesh;
  }
  
  function animate(mesh) {
   return () => {
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;
    render();
   }
  }
}

main();