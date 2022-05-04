import * as THREE from "three"

import { OrbitControls } from "./OrbitControls.js"

const fs = require('fs');


// Event Display Code

// Some hard coded detector geometry (to be later sent via the server).
// const detector = [];
// detector.push( new THREE.Vector3( - 10, 0, 0 ) );
// detector.push( new THREE.Vector3( 0, 10, 0 ) );
// detector.push( new THREE.Vector3( 10, 0, 0 ) );

const hits = [];
hits.push( new THREE.Vector3( 1690, 1810, 0 ) );

// Parses the PMT position/production date info from the .dat file.
function ParsePMTInfo() {
    let text = fs.readFileSync('pmt_prod_year.dat', 'utf8');

    const pmt_info = [];

    for (let line of text.trim().split('\n')) {

        let s = line.trim().split(/[#\s]+/g);

        pmt_info.push({
            id: s[0],
            prod_month: s[1],
            x: s[2],
            y: s[3],
            z: s[4],
        });
    }

    return pmt_info
}

// Use and convert detector geo into an actual mesh.
function PlotDetector() {
    const geometry = new THREE.CylinderGeometry( 1690, 1690, 2*1810, 64);
    const material = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.5} );
    const mesh = new THREE.Mesh( geometry, material );

    // const geometry = new THREE.BufferGeometry().setFromPoints(detector);
    // const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
    // const mesh = new THREE.Line(geometry, material);

    return mesh;
}

// Plot yellow spheres for a list of Vector3s
function PlotHits( scene, hits ) {
    const hit_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const material = new THREE.MeshBasicMaterial( {color: 0xFFFF00} );
    for (let hit of hits) {
        const mesh = new THREE.Mesh( hit_geom, material )
        mesh.position.copy( hit );
        scene.add( mesh );
    }

    return
}

// Plot all PMTs from pmt_info
function PlotPMTs( scene, pmt_info ) {
    const pmt_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const material = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.5} );
    for (let pmt of pmt_info) {
        const mesh = new THREE.Mesh( pmt_geom, material );
        mesh.position.set( pmt.x, pmt.y, pmt.z );
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

pmt_info = ParsePMTInfo()

PlotHits( scene, hits );
PlotPMTs( scene, pmt_info );

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