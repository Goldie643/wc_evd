import * as THREE from "three"

import { OrbitControls } from "./OrbitControls.js"

// Event Display Code

// Some hard coded detector geometry (to be later sent via the server).
// const detector = [];
// detector.push( new THREE.Vector3( - 10, 0, 0 ) );
// detector.push( new THREE.Vector3( 0, 10, 0 ) );
// detector.push( new THREE.Vector3( 10, 0, 0 ) );

const hits = [];
hits.push( new THREE.Vector3( 1690, 1810, 0 ) );

// Use and convert detector geo into an actual mesh.
function PlotDetector() {
    const geometry = new THREE.CylinderGeometry( 1690, 1690, 2*1810, 64);
    const material = new THREE.MeshBasicMaterial( {color: 0x808080, transparent:
        true, opacity: 0.5} );
    const mesh = new THREE.Mesh( geometry, material );

    // const geometry = new THREE.BufferGeometry().setFromPoints(detector);
    // const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
    // const mesh = new THREE.Line(geometry, material);

    return mesh;
}

function PlotHits( scene, hits ) {
    const material = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );
    const hit_geom = new THREE.SphereGeometry( 25, 32, 16 );
    for (let hit of hits) {
        const mesh = new THREE.Mesh( hit_geom, material )
        mesh.position.copy( hit );
        // mesh.position.set( 100, 100, 100 );
        scene.add( mesh );
    }

}

// Setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup a scene
const scene = new THREE.Scene();
const detectorMesh = PlotDetector();
scene.add(detectorMesh);

PlotHits( scene, hits );

// Setup a default camera (other control types like Ortho are available).
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth /
    window.innerHeight, 1, 100000 );

// Control camera with orbit controls
const controls = new OrbitControls( camera, renderer.domElement );

camera.position.set( 0, 5000, 10000 );
camera.lookAt( 0, 0, 0 );

controls.update()

// renderer.render( scene, camera );
function animate() {
    controls.update()
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
};
animate();