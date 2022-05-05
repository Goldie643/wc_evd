import * as THREE from "three"
import { pmt_info } from "./pmt_prod_year.js"
import { OrbitControls } from "./OrbitControls.js"

const event = await fetch("event.json").then(response => response.json());

// Use and convert detector geo into an actual mesh.
function PlotDetector( scene ) {
    const geometry = new THREE.CylinderGeometry( 1690, 1690, 2*1810, 64);
    const material = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.5} );
    const mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh )

    return;
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
function PlotPMTs( scene, pmt_info, hits=[] ) {
    const pmt_geom = new THREE.SphereGeometry( 25, 32, 16 );
    const nohit_mat = new THREE.MeshBasicMaterial( {color: 0x808080,
        transparent: true, opacity: 0.1} );
    const hit_mat = new THREE.MeshBasicMaterial( {color: 0xFFFF00} )
    for (let pmt of pmt_info) {
        let mat = nohit_mat;
        if (hits.includes( pmt.cable )) {
            mat = hit_mat;
        };
        const mesh = new THREE.Mesh( pmt_geom, mat );
        // SK orientates Z upwards (which is correct, by the way)
        mesh.position.set( pmt.x, pmt.z, pmt.y );
        scene.add( mesh );
    }
    
    return
}

function PlotVTX( scene, vtx ) {
    const geom = new THREE.SphereGeometry( 25, 32, 16 );
    const mat = new THREE.MeshBasicMaterial( {color: 0xFF0000} );
    const mesh = new THREE.Mesh( geom, mat );

    // SK orientates Z upwards (which is correct, by the way)
    mesh.position.set( vtx.x, vtx.z, vtx.y );
    scene.add( mesh );

    // Now add an arrow for direction
    const dir = new THREE.Vector3( vtx.x_dir, vtx.y_dir, vtx.z_dir );
    dir.normalize();
    const origin = new THREE.Vector3( vtx.x, vtx.z, vtx.y );
    const length = 1000;
    const hex = 0xFF0000
    const arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
    scene.add( arrowHelper )
    
    return
}

// Setup renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup a scene
const scene = new THREE.Scene();

// Add all the meshes to the scene
// PlotDetector( scene );
// PlotHits( scene, hits );
PlotPMTs( scene, pmt_info, event.cable );
PlotVTX( scene, event )

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